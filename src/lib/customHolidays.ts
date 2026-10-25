import type { ThaiPublicHoliday } from "@/lib/thaiPublicHolidays";
import { BUDDHIST_ERA_OFFSET, toBuddhistYear } from "@/lib/thaiDate";

export const CUSTOM_HOLIDAYS_COLLECTION = "customHolidays";

export type CustomHolidayType =
  | "government_holiday"
  | "substitution_holiday"
  | "special_holiday";

export interface CustomHoliday {
  id: string;
  date: string;
  name_th: string;
  name_en?: string;
  type: CustomHolidayType;
  buddhistYear: number;
  note?: string | null;
  createdAt?: unknown;
}

export function buddhistYearFromDateString(date: string): number {
  const y = parseInt(date.slice(0, 4), 10);
  if (Number.isNaN(y)) return toBuddhistYear(new Date());
  return y + BUDDHIST_ERA_OFFSET;
}

export function dateWithinCeYear(date: string, ceYear: number): boolean {
  return date.startsWith(`${ceYear}-`);
}

export function customHolidayToPublic(h: CustomHoliday): ThaiPublicHoliday {
  return {
    date: h.date,
    name_th: h.name_th,
    name_en: h.name_en?.trim() || h.name_th,
    type: h.type,
    is_substitution: h.type === "substitution_holiday",
    note: h.note ?? null,
  };
}

export const CUSTOM_HOLIDAY_TYPE_OPTIONS: { value: CustomHolidayType; label: string }[] = [
  { value: "substitution_holiday", label: "วันหยุดชดเชย" },
  { value: "special_holiday", label: "วันหยุดพิเศษ" },
  { value: "government_holiday", label: "วันหยุดราชการ (เพิ่มเติม)" },
];

export function sortCustomHolidaysByDate(rows: CustomHoliday[]): CustomHoliday[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.name_th.localeCompare(b.name_th));
}
