import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

const FUNCTIONS_REGION = "asia-southeast1";

const TELEGRAM_BOT_TOKEN = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "").trim();
const TELEGRAM_CHAT_ID_RAW = (import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "").trim();

function escHtml(value: unknown): string {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseChatId(raw: string): string | number {
  const t = raw.trim();
  if (/^-?\d+$/.test(t)) {
    const n = Number(t);
    if (Number.isSafeInteger(n)) return n;
  }
  return t;
}

function supergroupChatIdVariant(chatId: number): number | null {
  if (chatId >= 0 || String(chatId).startsWith("-100")) return null;
  const digits = String(Math.abs(chatId));
  if (digits.length < 9) return null;
  const alt = Number(`-100${digits}`);
  return Number.isSafeInteger(alt) ? alt : null;
}

async function sendMessageDirect(chatId: string | number, text: string): Promise<Response> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

function buildMessage(formData: Record<string, unknown>): string {
  return `
📢 <b>มีการขอจองห้องประชุมใหม่!</b>
🏢 <b>ห้องประชุม :</b> ${escHtml(formData.room)}
📅 <b>วันที่ :</b> ${escHtml(formData.date)}
⏰ <b>เวลา :</b> ${escHtml(formData.startTime)} น. ถึง ${escHtml(formData.endTime)} น.
👤 <b>ผู้จอง :</b> ${escHtml(formData.bookerName)} (${escHtml(formData.department)})
📞 <b>เบอร์ติดต่อ :</b> ${escHtml(formData.bookerPhone)}
📝 <b>เรื่อง :</b> ${escHtml(formData.topic)}
🔍 <b>Tracking ID :</b> ${escHtml(formData.trackingNumber)}
  `.trim();
}

async function sendViaCloudFunction(
  formData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const functions = getFunctions(app, FUNCTIONS_REGION);
    const notify = httpsCallable(functions, "notifyTelegramBooking");
    await notify(formData);
    return { ok: true };
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : String(err);
    console.error("Telegram (Cloud Function):", err);
    return { ok: false, error: msg };
  }
}

async function sendViaBrowserDirect(
  formData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID_RAW) {
    return { ok: false, error: "ไม่ได้ตั้ง VITE_TELEGRAM_* ใน .env.local" };
  }

  const message = buildMessage(formData);
  let chatId: string | number = parseChatId(TELEGRAM_CHAT_ID_RAW);

  try {
    let response = await sendMessageDirect(chatId, message);
    let body = await response.text();

    if (!response.ok && body.includes("chat not found") && typeof chatId === "number") {
      const alt = supergroupChatIdVariant(chatId);
      if (alt !== null) {
        response = await sendMessageDirect(alt, message);
        body = await response.text();
      }
    }

    if (!response.ok) {
      console.error("ส่ง Telegram ไม่สำเร็จ:", body);
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Production: ส่งผ่าน Firebase Cloud Function (token อยู่ฝั่ง server)
 * Development: ลอง Cloud Function ก่อน แล้ว fallback ไป .env.local
 */
export const sendTelegramNotification = async (
  formData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> => {
  const fromCloud = await sendViaCloudFunction(formData);
  if (fromCloud.ok) return fromCloud;

  if (import.meta.env.DEV) {
    const fromDirect = await sendViaBrowserDirect(formData);
    if (fromDirect.ok) return fromDirect;
    return {
      ok: false,
      error: fromDirect.error ?? fromCloud.error,
    };
  }

  return fromCloud;
};
