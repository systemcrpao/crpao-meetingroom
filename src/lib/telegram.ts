const TELEGRAM_BOT_TOKEN = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "").trim();
const TELEGRAM_CHAT_ID_RAW = (import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "").trim();

function parseChatId(raw: string): string | number {
  const t = raw.trim();
  if (/^-?\d+$/.test(t)) {
    const n = Number(t);
    if (Number.isSafeInteger(n)) return n;
  }
  return t;
}

/** กลุ่มที่อัปเกรดเป็น supergroup มักใช้ -100xxxxxxxxxx แทน -xxxxxxxxx */
function supergroupChatIdVariant(chatId: number): number | null {
  if (chatId >= 0 || String(chatId).startsWith("-100")) return null;
  const digits = String(Math.abs(chatId));
  if (digits.length < 9) return null;
  const alt = Number(`-100${digits}`);
  return Number.isSafeInteger(alt) ? alt : null;
}

function escHtml(value: unknown): string {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendMessage(chatId: string | number, text: string): Promise<Response> {
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

export const sendTelegramNotification = async (formData: Record<string, unknown>) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID_RAW) return;

  const message = `
📢 <b>มีการขอจองห้องประชุมใหม่!</b>
🏢 <b>ห้องประชุม :</b> ${escHtml(formData.room)}
📅 <b>วันที่ :</b> ${escHtml(formData.date)}
⏰ <b>เวลา :</b> ${escHtml(formData.startTime)} น. ถึง ${escHtml(formData.endTime)} น.
👤 <b>ผู้จอง :</b> ${escHtml(formData.bookerName)} (${escHtml(formData.department)})
📞 <b>เบอร์ติดต่อ :</b> ${escHtml(formData.bookerPhone)}
📝 <b>เรื่อง :</b> ${escHtml(formData.topic)}
🔍 <b>Tracking ID :</b> ${escHtml(formData.trackingNumber)}
  `.trim();

  let chatId: string | number = parseChatId(TELEGRAM_CHAT_ID_RAW);

  try {
    let response = await sendMessage(chatId, message);

    if (!response.ok) {
      const body = await response.text();
      const chatNotFound =
        body.includes("chat not found") || body.includes("bot was kicked");

      if (chatNotFound && typeof chatId === "number") {
        const alt = supergroupChatIdVariant(chatId);
        if (alt !== null && alt !== chatId) {
          response = await sendMessage(alt, message);
          if (response.ok) {
            console.warn(
              "Telegram: ส่งสำเร็จด้วย Chat ID แบบ supergroup — อัปเดต VITE_TELEGRAM_CHAT_ID เป็น",
              alt,
            );
            return;
          }
        }
      }

      console.error("ส่ง Telegram ไม่สำเร็จ:", body);
      if (chatNotFound) {
        console.error(
          "แก้ไข: 1) เชิญบอทเข้ากลุ่มอีกครั้ง 2) ส่งข้อความในกลุ่ม 3) ดู chat id จาก getUpdates 4) ใส่ใน VITE_TELEGRAM_CHAT_ID (มักขึ้นต้น -100)",
        );
      }
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
  }
};
