/**
 * ตรวจก่อน commit/push — ห้ามมี secret ในไฟล์ที่จะ commit
 * รัน: npm run check:secrets
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const ALLOWED_ENV_FILES = new Set([".env.example"]);

const SECRET_PATTERNS = [
  { name: "Firebase API key", re: /AIzaSy[A-Za-z0-9_-]{20,}/ },
  { name: "Telegram bot token", re: /\d{8,10}:[A-Za-z0-9_-]{30,}/ },
  {
    name: "Firebase service account private key",
    re: /-----BEGIN (RSA )?PRIVATE KEY-----/,
  },
];

function git(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getStagedFiles() {
  const out = git("git diff --cached --name-only");
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
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

function isForbiddenEnvPath(filePath) {
  const name = basename(filePath);
  if (name === ".env") return true;
  if (name.startsWith(".env.") && !ALLOWED_ENV_FILES.has(name)) return true;
  if (name.endsWith(".local")) return true;
  if (/firebase-adminsdk.*\.json$/i.test(name)) return true;
  if (/^service-?account.*\.json$/i.test(name)) return true;
  return false;
}

let failed = false;

const trackedSecrets = git("git ls-files -- .env .env.local .env.production .env.development");
if (trackedSecrets) {
  console.error("❌ ไฟล์ env ถูก track ใน git แล้ว — ต้องเอาออกจาก repo:");
  console.error(trackedSecrets.split(/\r?\n/).map((l) => `   ${l}`).join("\n"));
  console.error("   รัน: git rm --cached .env.local  (แล้ว commit)");
  failed = true;
}

const staged = getStagedFiles();

for (const file of staged) {
  if (isForbiddenEnvPath(file)) {
    console.error(`❌ ห้าม stage ไฟล์ที่มีความลับ: ${file}`);
    failed = true;
  }
}

const toScan =
  staged.length > 0
    ? staged.filter((f) => !f.includes("node_modules"))
    : [".env.example", "src/lib/firebase.ts", "src/lib/telegram.ts", "firestore.rules"];

const scanText = getWorkingTreeText(toScan);

for (const { name, re } of SECRET_PATTERNS) {
  if (re.test(scanText)) {
    const where = staged.length ? "ในไฟล์ที่ stage แล้ว" : "ในไฟล์ที่ตรวจ";
    console.error(`❌ พบ ${name} ${where} — เอาออกก่อน push`);
    failed = true;
  }
}

if (failed) {
  console.error("\nใช้ .env.local (ไม่ commit) และ GitHub Repository secrets สำหรับ deploy");
  console.error("ดูรายละเอียด: SECURITY-PUSH.md");
  process.exit(1);
}

console.log("✓ ไม่พบ secret ในไฟล์ที่ตรวจ (stage หรือไฟล์ config หลัก)");
if (staged.length === 0) {
  console.log("  หมายเหตุ: ยังไม่มีไฟล์ stage — หลัง git add ให้รันคำสั่งนี้อีกครั้ง");
}
