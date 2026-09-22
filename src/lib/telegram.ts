/** ส่งจากเบราว์เซอร์ — ค่า VITE_TELEGRAM_* ฝังตอน build (GitHub Actions หรือ .env.local) */

function normalizeEnv(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

const TELEGRAM_BOT_TOKEN = normalizeEnv(import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "");
const TELEGRAM_CHAT_ID_RAW = normalizeEnv(import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "");

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

export const sendTelegramNotification = async (
  formData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID_RAW) {
    return {
      ok: false,
      error: "ไม่ได้ตั้ง VITE_TELEGRAM_BOT_TOKEN / VITE_TELEGRAM_CHAT_ID ตอน build",
    };
  }

  const message = buildMessage(formData);
  const chatId = parseChatId(TELEGRAM_CHAT_ID_RAW);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const body = await response.text();

    if (!response.ok) {
      console.error("ส่ง Telegram ไม่สำเร็จ:", body);
      console.error(
        "chat_id ที่ใช้ตอน build:",
        TELEGRAM_CHAT_ID_RAW,
        "— กลุ่มที่ถูกคือ -519612591; แก้ GitHub Secret แล้ว Run workflow deploy ใหม่",
      );
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
    return { ok: false, error: String(error) };
  }
};
