# Telegram ผ่าน GitHub Actions (วิธีที่ใช้อยู่)

ค่า Telegram ฝังในไฟล์ JS ตอน **build** จาก GitHub Secrets — **ไม่ต้อง** deploy Firebase Functions

## GitHub Repository secrets

ตั้งใน **Settings → Secrets and variables → Actions**:

| Secret | ค่า |
|--------|-----|
| `VITE_TELEGRAM_BOT_TOKEN` | token จาก BotFather (ไม่มี `<` `>`) |
| `VITE_TELEGRAM_CHAT_ID` | `-519612591` (กลุ่ม รายงานห้องประชุม อบจ.ชร.) |

Firebase secrets อื่น ๆ ยังใช้ตาม `.env.example`

## หลังแก้ secret

1. **Actions → Deploy GitHub Pages → Run workflow** (หรือ push commit ใด ๆ ขึ้น `main`)
2. รอ build เสร็จ แล้วทดสอบจองบนเว็บ production

## พัฒนาในเครื่อง

ใส่ค่าเดียวกันใน `.env.local` แล้ว `npm run dev`

## ทดสอบบอท + กลุ่ม

```text
https://api.telegram.org/botPASTE_BOT_TOKEN_HERE/sendMessage?chat_id=-519612591&text=test
```

ต้องได้ `"ok":true`

## ข้อควรรู้ (ความปลอดภัย)

Token จะอยู่ในไฟล์ JS ที่ผู้ใช้ดาวน์โหลดได้ — ใช้บอทเฉพาะส่งแจ้งเตือน อย่าให้สิทธิ์ admin ในกลุ่มเกินจำเป็น  
ถ้าต้องการซ่อน token จริง ๆ ใช้ Firebase Cloud Function แทน (โฟลเดอร์ `functions/` ใน repo)
