const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const botToken = defineSecret("TELEGRAM_BOT_TOKEN");
const chatIdSecret = defineSecret("TELEGRAM_CHAT_ID");

function escHtml(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function supergroupChatIdVariant(chatId) {
  if (chatId >= 0 || String(chatId).startsWith("-100")) return null;
  const digits = String(Math.abs(chatId));
  if (digits.length < 9) return null;
  const alt = Number(`-100${digits}`);
  return Number.isSafeInteger(alt) ? alt : null;
}

async function sendMessage(token, chatId, text) {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
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

    let chatId = /^-?\d+$/.test(rawChat) ? Number(rawChat) : rawChat;

    const message = `
📢 <b>มีการขอจองห้องประชุมใหม่!</b>
🏢 <b>ห้องประชุม :</b> ${escHtml(d.room)}
📅 <b>วันที่ :</b> ${escHtml(d.date)}
⏰ <b>เวลา :</b> ${escHtml(d.startTime)} น. ถึง ${escHtml(d.endTime)} น.
👤 <b>ผู้จอง :</b> ${escHtml(d.bookerName)} (${escHtml(d.department)})
📞 <b>เบอร์ติดต่อ :</b> ${escHtml(d.bookerPhone)}
📝 <b>เรื่อง :</b> ${escHtml(d.topic)}
🔍 <b>Tracking ID :</b> ${escHtml(d.trackingNumber)}
    `.trim();

    let response = await sendMessage(token, chatId, message);
    let body = await response.text();

    if (
      !response.ok &&
      body.includes("chat not found") &&
      typeof chatId === "number"
    ) {
      const alt = supergroupChatIdVariant(chatId);
      if (alt !== null) {
        response = await sendMessage(token, alt, message);
        body = await response.text();
      }
    }

    if (!response.ok) {
      console.error("Telegram API:", body);
      throw new HttpsError("internal", body);
    }

    return { ok: true };
  },
);
