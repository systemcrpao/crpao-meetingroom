const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "";

export const sendTelegramNotification = async (formData: Record<string, unknown>) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const message = `
📢 <b>มีการขอจองห้องประชุมใหม่!</b>
🏢 <b>ห้องประชุม :</b> ${formData.room || "-"}
📅 <b>วันที่ :</b> ${formData.date || "-"}
⏰ <b>เวลา :</b> ${formData.startTime || "-"} น. ถึง ${formData.endTime || "-"} น.
👤 <b>ผู้จอง :</b> ${formData.bookerName || "-"} (${formData.department || "-"})
📞 <b>เบอร์ติดต่อ :</b> ${formData.bookerPhone || "-"}
📝 <b>เรื่อง :</b> ${formData.topic || "-"}
🔍 <b>Tracking ID :</b> ${formData.trackingNumber || "-"}
  `;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      console.error("ส่ง Telegram ไม่สำเร็จ:", await response.text());
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
  }
};
