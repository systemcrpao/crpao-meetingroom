# คู่มือ push GitHub อย่างปลอดภัย

## ห้ามอัปโหลดสาธารณะ (อยู่ใน `.gitignore` แล้ว)

| ประเภท | ตัวอย่างไฟล์ | มีอะไรอันตราย |
|--------|----------------|----------------|
| ค่า config จริง | `.env`, `.env.local`, `.env.production` | Firebase, Telegram, อีเมล Super Admin |
| Build บนเครื่อง | `dist/` | อาจฝังค่า `VITE_*` จากตอน build |
| คีย์ Firebase Admin | `*-firebase-adminsdk-*.json`, `serviceAccount*.json` | ควบคุม Firestore/Auth ได้เต็มที่ |
| โฟลเดอร์ CLI | `.firebase/` | token ชั่วคราวของ Firebase CLI |
| เอกสารภายใน | `docs/` | ตั้งใจไม่แชร์นอกองค์กร |

**Telegram Bot Token** และ **Firebase Web API Key** ที่ใส่ใน `.env.local` ห้าม commit — แม้ API Key ของ Firebase จะอยู่ใน bundle หลัง build แล้วก็ตาม การ commit ลง git ทำให้หมุน/จำกัดสิทธิยากขึ้น

## อัปโหลดได้ (ปลอดภัย)

| ไฟล์ | หมายเหตุ |
|------|----------|
| `.env.example` | มีแค่ชื่อตัวแปร ค่าว่าง |
| `src/lib/firebase.ts`, `src/lib/telegram.ts` | อ่าน `import.meta.env` เท่านั้น |
| `firestore.rules` | กฎสิทธิ์ ไม่ใช่ password |
| `.github/workflows/*.yml` | ใช้ `${{ secrets.* }}` ไม่ใส่ token ในไฟล์ |

## ค่าที่ต้องตั้งใน GitHub (Repository → Settings → Secrets)

ใส่ใน **Secrets** ไม่ใส่ใน repo:

| Secret | บังคับ |
|--------|--------|
| `VITE_FIREBASE_API_KEY` | ใช่ |
| `VITE_FIREBASE_AUTH_DOMAIN` | ใช่ |
| `VITE_FIREBASE_PROJECT_ID` | ใช่ |
| `VITE_FIREBASE_STORAGE_BUCKET` | ใช่ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ใช่ |
| `VITE_FIREBASE_APP_ID` | ใช่ |
| `VITE_TELEGRAM_BOT_TOKEN` | ถ้าใช้แจ้ง Telegram |
| `VITE_TELEGRAM_CHAT_ID` | ถ้าใช้แจ้ง Telegram |
| `VITE_SUPER_ADMIN_EMAILS` | แนะนำ (อีเมล Super Admin ตอน build) |

ค่าเดียวกับใน `.env.local` บนเครื่องพัฒนา

**Firebase Functions** (ถ้า deploy): ตั้ง `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` ใน Firebase Secret Manager — ไม่ commit ใน `functions/`

## ก่อน push ทุกครั้ง

```powershell
git status
npm run check:secrets
```

ตรวจว่า **ไม่เห็น** `.env` / `.env.local` ใน "Changes to be committed"

```powershell
git add .
npm run check:secrets
git commit -m "ข้อความ"
git push origin main
```

## ถ้าเคย commit `.env` หรือ token ในโค้ดไปแล้ว

1. `git rm --cached .env.local` แล้ว commit (ไฟล์ยังอยู่บนเครื่อง)
2. **หมุน Telegram token** ที่ BotFather
3. จำกัด Firebase API key ใน Google Cloud Console (HTTP referrer ของโดเมนจริง)
4. ถ้า repo เป็น Public และเคย leak service account JSON — **ลบ/สร้าง key ใหม่** ใน Firebase Console ทันที
