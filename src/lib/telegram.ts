/** ส่งจากเบราว์เซอร์ — ค่า VITE_TELEGRAM_* ฝังตอน build (GitHub Actions หรือ .env.local) */

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

function parseChatId(raw: string): number | string {
  if (/^-?\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isSafeInteger(n)) return n;
  }
  return raw;
}

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

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
};

async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
): Promise<{ ok: boolean; description?: string; raw: string }> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
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

  const chatId = parseChatId(TELEGRAM_CHAT_ID);
  const message = buildPlainMessage(formData);

  try {
    const sent = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, message);

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
};
