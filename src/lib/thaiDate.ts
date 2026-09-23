import { format } from "date-fns";
import { th } from "date-fns/locale";

export const BUDDHIST_ERA_OFFSET = 543;

export function toBuddhistYear(date: Date): number {
  return date.getFullYear() + BUDDHIST_ERA_OFFSET;
}

/** แปลงค่าวันที่จากฟิลด์จอง (yyyy-MM-dd หรือ Date) */
export function parseAppDate(input: string | Date | undefined | null): Date | null {
  if (input == null || input === "") return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 1 เม.ย. 2569 */
export function formatDateThaiBE(input: string | Date | undefined | null): string {
  const d = parseAppDate(input);
  if (!d) return "-";
  return `${format(d, "d MMM", { locale: th })} ${toBuddhistYear(d)}`;
}

/** 1 เมษายน 2569 */
export function formatDateThaiLongBE(input: string | Date | undefined | null): string {
  const d = parseAppDate(input);
  if (!d) return "-";
  return `${format(d, "d MMMM", { locale: th })} ${toBuddhistYear(d)}`;
}

/** เหมือนรูปแบบยาว — ไม่แสดงชื่อวันในสัปดาห์ */
export function formatDateThaiFullBE(input: string | Date | undefined | null): string {
  return formatDateThaiLongBE(input);
}

/** เมษายน 2569 */
export function formatMonthYearThaiBE(date: Date): string {
  return `${format(date, "MMMM", { locale: th })} ${toBuddhistYear(date)}`;
}

/** 1 เม.ย. — 30 เม.ย. 2569 */
export function formatDateRangeShortBE(start: Date, end: Date): string {
  const be = toBuddhistYear(end);
  return `${format(start, "d MMM", { locale: th })} — ${format(end, "d MMM", { locale: th })} ${be}`;
}

/** ป้ายย่อในปฏิทินรายสัปดาห์ */
export function formatMonthYearCompactBE(date: Date): string {
  return `${format(date, "MMM", { locale: th })} ${toBuddhistYear(date)}`;
}

/** 1 เมษายน 2569 10:30 น. */
export function formatDateTimeThaiBE(date: Date): string {
  return `${format(date, "d MMMM", { locale: th })} ${toBuddhistYear(date)} ${format(date, "HH:mm", { locale: th })} น.`;
}

/** ตัวเลือกปีใน dropdown — เก็บค่าเป็นค.ศ. สำหรับ filter ภายใน */
export function buddhistYearSelectLabel(ceYear: number): string {
  return String(ceYear + BUDDHIST_ERA_OFFSET);
}
