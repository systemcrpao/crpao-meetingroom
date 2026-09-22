/** ส่งจากเบราว์เซอร์ — ค่า VITE_TELEGRAM_* ฝังตอน build (GitHub Actions หรือ .env.local) */

function normalizeEnv(value: string): string {
  return value
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

const TELEGRAM_BOT_TOKEN = normalizeEnv(import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "");
const TELEGRAM_CHAT_ID = normalizeEnv(import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "").replace(
  /\s/g,
  "",
);

function buildPlainMessage(formData: Record<string, unknown>): string {
  return [
    "📢 มีการขอจองห้องประชุมใหม่!",
    `ห้องประชุม: ${formData.room ?? "-"}`,
    `วันที่: ${formData.date ?? "-"}`,
    `เวลา: ${formData.startTime ?? "-"} น. ถึง ${formData.endTime ?? "-"} น.`,
    `ผู้จอง: ${formData.bookerName ?? "-"} (${formData.department ?? "-"})`,
    `เบอร์ติดต่อ: ${formData.bookerPhone ?? "-"}`,
    `เรื่อง: ${formData.topic ?? "-"}`,
    `Tracking ID: ${formData.trackingNumber ?? "-"}`,
  ].join("\n");
}

async function fetchTelegramGet(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; body: string }> {
  const params = new URLSearchParams({
    chat_id: chatId,
    text: text.slice(0, 4096),
  });
  const url = `https://api.telegram.org/bot${token}/sendMessage?${params.toString()}`;
  const response = await fetch(url, { method: "GET" });
  const body = await response.text();
  return { ok: response.ok, body };
}

async function logBotIdentity(token: string): Promise<void> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = await res.json();
    if (json?.ok && json?.result?.username) {
      console.error(
        "Telegram bot ใน build นี้: @%s — ต้องเป็นบอทที่อยู่ในกลุ่ม (เช่น reportCrpaoMeeting_bot)",
        json.result.username,
      );
    }
  } catch {
    /* ignore */
  }
}

export const sendTelegramNotification = async (
  formData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      error: "ไม่ได้ตั้ง VITE_TELEGRAM_BOT_TOKEN / VITE_TELEGRAM_CHAT_ID ตอน build",
    };
  }

  if (!/^-?\d+$/.test(TELEGRAM_CHAT_ID)) {
    return { ok: false, error: `รูปแบบ chat_id ไม่ถูกต้อง: ${TELEGRAM_CHAT_ID}` };
  }

  const message = buildPlainMessage(formData);

  try {
    const { ok, body } = await fetchTelegramGet(
      TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID,
      message,
    );

    if (!ok) {
      console.error("ส่ง Telegram ไม่สำเร็จ:", body);
      console.error("chat_id ที่ใช้:", TELEGRAM_CHAT_ID);
      await logBotIdentity(TELEGRAM_BOT_TOKEN);
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
    return { ok: false, error: String(error) };
  }
};
