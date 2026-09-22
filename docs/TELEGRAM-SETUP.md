# ตั้งค่า Telegram (บอทใหม่)

## ทำไม GitHub Secrets อย่างเดียวไม่พอ

เว็บบน GitHub Pages ส่ง Telegram **ผ่าน Firebase Cloud Function** (`notifyTelegramBooking`)  
Token ต้องอยู่ที่ **Firebase Functions Secrets** ไม่ใช่แค่ใน GitHub Actions

---

## 1) บอทและกลุ่ม

1. สร้างบอทที่ [@BotFather](https://t.me/BotFather) → เก็บ **token ใหม่**
2. เปิด **กลุ่มแจ้งเตือนจองห้อง** (ไม่ใช่แชททดสอบ bot อื่น)
3. **เชิญบอทใหม่เข้ากลุ่ม** → ให้สิทธิ์ส่งข้อความ
4. พิมพ์ข้อความในกลุ่ม 1 ครั้ง

## 2) หา Chat ID ของกลุ่มนั้น

เปิด (แทนที่ `PASTE_BOT_TOKEN_HERE` ด้วย token จริง **ห้าม** ใส่ `<` `>`):

```text
https://api.telegram.org/botPASTE_BOT_TOKEN_HERE/getUpdates
```

หา `"chat":{"id":...}` ของ**กลุ่มจองห้อง** (เช่น `-519612591`) — ต้องตรงทุกหลัก ไม่ใช่ค่าเก่าที่คล้ายกัน

## 3) ตั้ง Secrets บน Firebase (สำคัญ)

```powershell
npm i -g firebase-tools
firebase login
firebase use crpao-meetingroom

cd functions
npm install
cd ..

firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID

firebase deploy --only functions
```

## 4) ทดสอบส่งตรง (ไม่ผ่านเว็บ)

```text
https://api.telegram.org/botPASTE_BOT_TOKEN_HERE/sendMessage?chat_id=-519612591&text=test
```

ตัวอย่างรูปแบบที่ถูก: `.../bot123456789:AAHxxxx/sendMessage?...` (ต่อจากคำว่า `bot` ติด token เลย)

ถ้าข้อ 4 ไม่เข้ากลุ่ม → แก้บอท/กลุ่ม/Chat ID ก่อน  
ถ้าข้อ 4 เข้า แต่เว็บไม่เข้า → ตรวจ deploy Functions และ region `asia-southeast1`

## 5) GitHub Actions (ไม่บังคับสำหรับ Telegram อีกต่อไป)

ลบ `VITE_TELEGRAM_*` ออกจาก workflow ได้ (ปลอดภัยกว่า)  
Firebase + Telegram ใช้ secrets ในข้อ 3 เท่านั้น

## 6) พัฒนาในเครื่อง

`.env.local` ยังใช้ `VITE_TELEGRAM_*` ได้เป็น **fallback** ถ้า Cloud Function ยังไม่ deploy
