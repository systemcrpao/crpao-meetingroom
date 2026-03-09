// src/lib/telegram.ts

const TELEGRAM_BOT_TOKEN = "8727123556:AAGhBoPL0aprosgF7wttuMFG78n1RGAriEA";
const TELEGRAM_CHAT_ID = "-5196162591";

export const sendTelegramNotification = async (formData: any) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  // จัดรูปแบบข้อความที่จะส่งเข้ากลุ่ม
  const message = `
📢 <b>มีการขอจองห้องประชุมใหม่!</b>
🏢 <b>ห้องประชุม :</b> ${formData.room || '-'}
📅 <b>วันที่ :</b> ${formData.date || '-'}
⏰ <b>เวลา :</b> ${formData.startTime || '-'} น. ถึง ${formData.endTime || '-'} น.
👤 <b>ผู้จอง :</b> ${formData.bookerName || '-'} (${formData.department || '-'})
📞 <b>เบอร์ติดต่อ :</b> ${formData.bookerPhone || '-'}
📝 <b>เรื่อง :</b> ${formData.topic || '-'}
🔍 <b>Tracking ID :</b> ${formData.trackingNumber || '-'}
  `;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML", // อนุญาตให้ใช้ตัวหนา <b> ได้
      }),
    });
    
    if (response.ok) {
        console.log("ส่งแจ้งเตือน Telegram สำเร็จเรียบร้อย!");
    } else {
        console.error("ส่ง Telegram ไม่สำเร็จ:", await response.text());
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Telegram:", error);
  }
};