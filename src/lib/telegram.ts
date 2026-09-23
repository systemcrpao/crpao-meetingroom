/** ส่งจากเบราว์เซอร์ — ค่า VITE_TELEGRAM_* ฝังตอน build (GitHub Actions หรือ .env.local) */

import { formatDateThaiBE } from "@/lib/thaiDate";

function normalizeEnv(value: string): string {
  return value
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

const TELEGRAM_BOT_TOKEN = normalizeEnv(import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "");
const TELEGRAM_CHAT_ID = normalizeEnv(import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "")
  .replace(/\s/g, "")
  .replace(/\u2212/g, "-");

type TelegramEntity = { offset: number; length: number; type: "bold" };

/** ใช้ entities แทน HTML — แสดงตัวหนาสม่ำเสมอทั้ง Desktop และ Mobile */
class TelegramMessageBuilder {
  private text = "";
  private entities: TelegramEntity[] = [];

  private append(part: string, bold: boolean) {
    if (!part) return;
    if (bold) {
      this.entities.push({ offset: this.text.length, length: part.length, type: "bold" });
    }
    this.text += part;
  }

  newline() {
    if (this.text.length > 0) this.text += "\n";
  }

  /** บรรทัดทั้งหมดเป็นตัวหนา */
  boldLine(content: string) {
    this.newline();
    this.append(content, true);
  }

  /** emoji + หัวข้อตัวหนา + ค่าปกติ */
  field(emoji: string, label: string, value: string) {
    this.newline();
    this.append(`${emoji} ${label}`, true);
    this.append(` ${value}`, false);
  }

  build(maxLen = 4096): { text: string; entities: TelegramEntity[] } {
    const text = this.text.slice(0, maxLen);
    const entities = this.entities.filter((e) => e.offset + e.length <= text.length);
    return { text, entities };
  }
}

function displayDate(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDateThaiBE(s);
  return s;
}

function buildNewBookingMessage(formData: Record<string, unknown>): {
  text: string;
  entities: TelegramEntity[];
} {
  const b = new TelegramMessageBuilder();
  b.boldLine("📢 มีการขอจองห้องประชุมใหม่!");
  b.field("🏢", "ห้องประชุม:", String(formData.room ?? "-"));
  b.field("📅", "วันที่:", displayDate(formData.date));
  b.field(
    "⏰",
    "เวลา:",
    `${String(formData.startTime ?? "-")} น. ถึง ${String(formData.endTime ?? "-")} น.`,
  );
  b.field(
    "👤",
    "ผู้จอง:",
    `${String(formData.bookerName ?? "-")} (${String(formData.department ?? "-")})`,
  );
  b.field("📞", "เบอร์ติดต่อ:", String(formData.bookerPhone ?? "-"));
  b.field("📝", "เรื่อง:", String(formData.topic ?? "-"));
  b.field("🔍", "Tracking ID:", String(formData.trackingNumber ?? "-"));
  return b.build();
}

function buildApprovedMessage(data: Record<string, unknown>): {
  text: string;
  entities: TelegramEntity[];
} {
  const b = new TelegramMessageBuilder();
  b.boldLine("✅ อนุมัติการจองห้องประชุมแล้ว");
  b.field("🏢", "ห้องประชุม:", String(data.room ?? "-"));
  b.field("📅", "วันที่:", displayDate(data.date));
  b.field("🔍", "Tracking ID:", String(data.trackingNumber ?? "-"));
  b.field("📋", "สถานะ:", "อนุมัติแล้ว");
  return b.build();
}

function parseChatId(raw: string): number | string {
  if (/^-?\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isSafeInteger(n)) return n;
  }
  return raw;
}

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
};

async function sendTelegramPayload(
  token: string,
  chatId: number | string,
  payload: { text: string; entities: TelegramEntity[] },
): Promise<{ ok: boolean; description?: string; raw: string }> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: payload.text,
      entities: payload.entities.length > 0 ? payload.entities : undefined,
    }),
  });
  const raw = await response.text();
  try {
    const json = JSON.parse(raw) as TelegramApiResponse;
    return { ok: json.ok, description: json.description, raw };
  } catch {
    return { ok: false, description: raw, raw };
  }
}

async function dispatchTelegram(payload: { text: string; entities: TelegramEntity[] }): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      error: "ไม่ได้ตั้ง VITE_TELEGRAM_BOT_TOKEN / VITE_TELEGRAM_CHAT_ID ตอน build",
    };
  }

  if (!/^-?\d+$/.test(TELEGRAM_CHAT_ID)) {
    return { ok: false, error: `รูปแบบ chat_id ไม่ถูกต้อง: ${TELEGRAM_CHAT_ID}` };
  }

  const chatId = parseChatId(TELEGRAM_CHAT_ID);

  try {
    const sent = await sendTelegramPayload(TELEGRAM_BOT_TOKEN, chatId, payload);

    if (!sent.ok) {
      console.error("ส่ง Telegram ไม่สำเร็จ:", sent.raw);
      console.error("chat_id ที่ใช้:", TELEGRAM_CHAT_ID);
      return {
        ok: false,
        error: sent.description ?? sent.raw,
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
    return { ok: false, error: String(error) };
  }
}

export const sendTelegramNotification = async (
  formData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> => {
  return dispatchTelegram(buildNewBookingMessage(formData));
};

export const sendTelegramApprovalNotification = async (data: {
  room?: string;
  date?: string;
  trackingNumber?: string;
}): Promise<{ ok: boolean; error?: string }> => {
  return dispatchTelegram(buildApprovedMessage(data));
};
