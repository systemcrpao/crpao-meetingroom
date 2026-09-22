# ระบบจองห้องประชุม — องค์การบริหารส่วนจังหวัดเชียงราย

เว็บแอปสำหรับจองห้องประชุม ตรวจสอบปฏิทิน ติดตามสถานะ และบริหารจัดการการอนุมัติ (ฝั่งเจ้าหน้าที่)

## คุณสมบัติหลัก

- **หน้าสาธารณะ** — ปฏิทินการใช้ห้อง (real-time), ฟอร์มจอง, พิมพ์แบบฟอร์ม HTML, หมายเลขติดตาม 5 หลัก
- **ติดตามสถานะ** — ค้นหาด้วย tracking number
- **ผู้ดูแล** — อนุมัติ/ปฏิเสธ, จัดการรายการ, รายงานสถิติ, สำรองข้อมูล JSON
- **แจ้งเตือน Telegram** — เมื่อมีการจองใหม่ (ตั้งค่าผ่าน environment)

## เทคโนโลยี

Vite · React 18 · TypeScript · React Router · Firebase (Firestore + Auth) · shadcn/ui · Tailwind CSS

## เริ่มต้นพัฒนา

```sh
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# แก้ไข .env.local ให้ครบค่า Firebase และ Telegram (ถ้าต้องการแจ้งเตือน)
npm run dev
```

เซิร์ฟเวอร์พัฒนา: `http://localhost:8080`

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `VITE_FIREBASE_*` | ใช่ | ค่าจาก Firebase Console → Project settings → Web app |
| `VITE_TELEGRAM_BOT_TOKEN` | ไม่ | Bot token สำหรับแจ้งเตือน |
| `VITE_TELEGRAM_CHAT_ID` | ไม่ | Chat/Group ID |

รายละเอียดฟิลด์ดูใน `.env.example`

## คำสั่ง

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | สร้างไฟล์ production ใน `dist/` |
| `npm run preview` | ทดสอบ build ในเครื่อง |
| `npm run lint` | ตรวจ ESLint |
| `npm test` | รัน Vitest |

## Deploy (Static hosting)

แอปเป็น SPA สแตติก — build แล้ว deploy โฟลเดอร์ `dist/` ไปยัง Firebase Hosting, Netlify, Vercel หรือเว็บเซิร์ฟเวอร์ที่รองรับ fallback ไป `index.html`

### ตัวอย่าง Firebase Hosting

1. ติดตั้ง CLI: `npm i -g firebase-tools`
2. `firebase login` และ `firebase init hosting` (public directory = `dist`, SPA = yes)
3. ตั้งค่า env บน CI หรือ build ในเครื่องที่มี `.env.local`
4. `npm run build` แล้ว `firebase deploy --only hosting`

### ก่อนเปิดใช้งานจริง

- ตรวจ **Firestore Security Rules** (การจองจากสาธารณะ vs การอนุมัติ/ลบของ admin)
- สร้างบัญชีผู้ดูแลใน **Firebase Authentication**
- อย่า commit ไฟล์ `.env` / `.env.local` ที่มี token จริง

## เส้นทางหลัก

| Path | คำอธิบาย |
|------|----------|
| `/` | ปฏิทิน + จองห้อง |
| `/tracking` | ติดตามสถานะ |
| `/login` | เข้าสู่ระบบผู้ดูแล |
| `/admin` | อนุมัติการจอง |
| `/admin/manage` | จัดการรายการ |
| `/admin/reports` | รายงาน |

## เอกสารระบบ

สถาปัตยกรรมและรายละเอียดฟังก์ชัน: [`.lovable/plan.md`](.lovable/plan.md)

## ไฟล์สำคัญ

| ไฟล์ | บทบาท |
|------|--------|
| `src/lib/firebase.ts` | Firebase init |
| `src/lib/mockData.ts` | ห้อง หน่วยงาน อุปกรณ์ ช่วงเวลา |
| `src/lib/pdfGenerator.ts` | พิมพ์แบบฟอร์ม (HTML + ฟอนต์ Sarabun ใน `public/`) |
| `src/lib/telegram.ts` | แจ้งเตือน Telegram |
