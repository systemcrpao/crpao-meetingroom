const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const botToken = defineSecret("TELEGRAM_BOT_TOKEN");
const chatIdSecret = defineSecret("TELEGRAM_CHAT_ID");

function supergroupChatIdVariant(chatId) {
  if (chatId >= 0 || String(chatId).startsWith("-100")) return null;
  const digits = String(Math.abs(chatId));
  if (digits.length < 9) return null;
  const alt = Number(`-100${digits}`);
  return Number.isSafeInteger(alt) ? alt : null;
}

class MessageBuilder {
  constructor() {
    this.text = "";
    this.entities = [];
  }

  append(part, bold) {
    if (!part) return;
    if (bold) {
      this.entities.push({ offset: this.text.length, length: part.length, type: "bold" });
    }
    this.text += part;
  }

  newline() {
    if (this.text.length > 0) this.text += "\n";
  }

  boldLine(content) {
    this.newline();
    this.append(content, true);
  }

  field(emoji, label, value) {
    this.newline();
    this.append(`${emoji} ${label}`, true);
    this.append(` ${String(value ?? "-")}`, false);
  }

  build() {
    return { text: this.text.slice(0, 4096), entities: this.entities };
  }
}

function buildNewBookingMessage(d) {
  const b = new MessageBuilder();
  b.boldLine("📢 มีการขอจองห้องประชุมใหม่!");
  b.field("🏢", "ห้องประชุม:", d.room);
  b.field("📅", "วันที่:", d.date);
  b.field("⏰", "เวลา:", `${d.startTime} น. ถึง ${d.endTime} น.`);
  b.field("👤", "ผู้จอง:", `${d.bookerName} (${d.department})`);
  b.field("📞", "เบอร์ติดต่อ:", d.bookerPhone);
  b.field("📝", "เรื่อง:", d.topic);
  b.field("🔍", "Tracking ID:", d.trackingNumber);
  return b.build();
}

async function sendMessage(token, chatId, payload) {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: payload.text,
      entities: payload.entities.length > 0 ? payload.entities : undefined,
    }),
  });
}

async function deliverTelegram(token, chatId, payload) {
  let response = await sendMessage(token, chatId, payload);
  let body = await response.text();

  if (!response.ok && body.includes("chat not found") && typeof chatId === "number") {
    const alt = supergroupChatIdVariant(chatId);
    if (alt !== null) {
      response = await sendMessage(token, alt, payload);
      body = await response.text();
    }
  }

  if (!response.ok) {
    console.error("Telegram API:", body);
    throw new HttpsError("internal", body);
  }

  return { ok: true };
}

exports.notifyTelegramBooking = onCall(
  {
    region: "asia-southeast1",
    secrets: [botToken, chatIdSecret],
  },
  async (request) => {
    const d = request.data ?? {};
    const tracking = String(d.trackingNumber ?? "");
    if (tracking.length !== 5) {
      throw new HttpsError("invalid-argument", "trackingNumber ไม่ถูกต้อง");
    }

    const token = botToken.value();
    const rawChat = chatIdSecret.value().trim();
    if (!token || !rawChat) {
      throw new HttpsError("failed-precondition", "ยังไม่ตั้ง TELEGRAM secrets บน Firebase Functions");
    }

    const chatId = /^-?\d+$/.test(rawChat) ? Number(rawChat) : rawChat;
    const payload = buildNewBookingMessage(d);
    return deliverTelegram(token, chatId, payload);
  },
);
