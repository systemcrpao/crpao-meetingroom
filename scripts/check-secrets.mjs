/**
 * ตรวจก่อน commit/push — ห้ามมี secret ในไฟล์ที่จะ commit
 * รัน: npm run check:secrets
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const FORBIDDEN_STAGED = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
];

const SECRET_PATTERNS = [
  { name: "Firebase API key", re: /AIzaSy[A-Za-z0-9_-]{20,}/ },
  { name: "Telegram bot token", re: /\d{8,10}:[A-Za-z0-9_-]{30,}/ },
];

function getStagedFiles() {
  try {
    const out = execSync("git diff --cached --name-only", { encoding: "utf8" }).trim();
    return out ? out.split(/\r?\n/) : [];
  } catch {
    return [];
  }
}

function getWorkingTreeText(files) {
  let text = "";
  for (const f of files) {
    if (!existsSync(f)) continue;
    try {
      text += readFileSync(f, "utf8") + "\n";
    } catch {
      /* ignore binary */
    }
  }
  return text;
}

let failed = false;

for (const name of FORBIDDEN_STAGED) {
  if (existsSync(name)) {
    try {
      const staged = execSync(`git diff --cached --name-only -- "${name}"`, {
        encoding: "utf8",
      }).trim();
      if (staged) {
        console.error(`❌ ห้าม stage ไฟล์: ${name}`);
        failed = true;
      }
    } catch {
      /* not a git repo or file not tracked */
    }
  }
}

const staged = getStagedFiles();
const toScan =
  staged.length > 0
    ? staged
    : [".env.example", "src/lib/firebase.ts", "src/lib/telegram.ts"];

const scanText = getWorkingTreeText(toScan.filter((f) => !f.includes("node_modules")));

for (const { name, re } of SECRET_PATTERNS) {
  if (re.test(scanText)) {
    const where = staged.length ? "ในไฟล์ที่ stage แล้ว" : "ในไฟล์ที่ตรวจ";
    console.error(`❌ พบ ${name} ${where} — เอาออกก่อน push`);
    failed = true;
  }
}

if (failed) {
  console.error("\nใช้ .env.local (ไม่ commit) และ GitHub Secrets สำหรับ deploy");
  process.exit(1);
}

console.log("✓ ไม่พบ secret ในไฟล์ที่ตรวจ (stage หรือไฟล์ config หลัก)");
if (staged.length === 0) {
  console.log("  หมายเหตุ: ยังไม่มีไฟล์ stage — หลัง git add ให้รันคำสั่งนี้อีกครั้ง");
}
