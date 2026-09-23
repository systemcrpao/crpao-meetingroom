/**
 * วันหยุดราชการไทย — ข้อมูลจาก Thailand Open Data
 * @see https://github.com/ppraserts/thailand-open-data/tree/main/data/thai-public-holidays
 */
const HOLIDAYS_BASE_URL =
  "https://raw.githubusercontent.com/ppraserts/thailand-open-data/main/data/thai-public-holidays";

export interface ThaiPublicHoliday {
  date: string;
  name_th: string;
  name_en: string;
  type: string;
  is_substitution: boolean;
  note: string | null;
}

interface YearHolidayFile {
  year: number;
  holidays: ThaiPublicHoliday[];
}

const memoryCache = new Map<number, ThaiPublicHoliday[]>();

export async function fetchThaiPublicHolidaysForYear(
  year: number,
): Promise<ThaiPublicHoliday[]> {
  if (memoryCache.has(year)) return memoryCache.get(year)!;

  try {
    const res = await fetch(`${HOLIDAYS_BASE_URL}/${year}.json`, {
      cache: "force-cache",
    });
    if (!res.ok) {
      memoryCache.set(year, []);
      return [];
    }
    const data = (await res.json()) as YearHolidayFile;
    const list = Array.isArray(data.holidays) ? data.holidays : [];
    memoryCache.set(year, list);
    return list;
  } catch {
    memoryCache.set(year, []);
    return [];
  }
}

export async function fetchThaiPublicHolidaysForYears(
  years: number[],
): Promise<ThaiPublicHoliday[]> {
  const unique = [...new Set(years)].filter((y) => y >= 2000 && y <= 2100);
  const lists = await Promise.all(unique.map(fetchThaiPublicHolidaysForYear));
  return lists.flat();
}

export function buildHolidayDateMap(
  holidays: ThaiPublicHoliday[],
): Map<string, ThaiPublicHoliday[]> {
  const map = new Map<string, ThaiPublicHoliday[]>();
  for (const h of holidays) {
    if (!h.date) continue;
    const existing = map.get(h.date);
    if (existing) existing.push(h);
    else map.set(h.date, [h]);
  }
  return map;
}

/** ชื่อสั้นสำหรับช่องปฏิทิน */
export function shortHolidayLabel(name: string, max = 14): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max)}…`;
}

export function holidayTypeLabel(type: string): string {
  switch (type) {
    case "government_holiday":
      return "วันหยุดราชการ";
    case "substitution_holiday":
      return "ชดเชย";
    case "special_holiday":
      return "หยุดพิเศษ";
    default:
      return "วันหยุดนักขัตฤกษ์";
  }
}
