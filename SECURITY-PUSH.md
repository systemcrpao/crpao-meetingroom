# คู่มือ push GitHub อย่างปลอดภัย

## ไฟล์ที่ห้าม commit

| ไฟล์ | เหตุผล |
|------|--------|
| `.env.local` | ค่า Firebase + Telegram จริง |
| `.env` (ที่มีค่าเต็ม) | เหมือนกัน |
| `dist/` | build output |

ไฟล์เหล่านี้อยู่ใน `.gitignore` แล้ว

## ไฟล์ที่ commit ได้

- `.env.example` — ชื่อตัวแปรอย่างเดียว **ไม่มีค่า**
- `src/lib/firebase.ts`, `src/lib/telegram.ts` — อ่านจาก `import.meta.env` เท่านั้น
- `.github/workflows/*.yml` — อ้าง `${{ secrets.* }}` ไม่ใส่ token ตรง ๆ

## ก่อน push ทุกครั้ง

```powershell
npm run check:secrets
git status
```

ตรวจว่า **ไม่เห็น** `.env.local` ในรายการ "Changes to be committed"

```powershell
git add .
npm run check:secrets
git commit -m "ข้อความ"
git push origin main
```

## GitHub Pages / Actions

ตั้ง **Repository secrets** (ไม่ใส่ใน repo):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_TELEGRAM_BOT_TOKEN` (ถ้าใช้)
- `VITE_TELEGRAM_CHAT_ID` (ถ้าใช้)

ค่าเดียวกับใน `.env.local` บนเครื่องพัฒนา

## ประวัติ Git เก่า

ถ้าเคย commit token ใน `firebase.ts` / `telegram.ts` มาก่อน และ repo เป็น **Public**  
แนะนำ **หมุน Telegram token** (BotFather) และพิจารณา Firebase API key restrictions ใน Google Cloud Console
