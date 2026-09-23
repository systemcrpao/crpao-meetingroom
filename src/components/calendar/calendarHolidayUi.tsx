import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  holidayTypeLabel,
  shortHolidayLabel,
  type ThaiPublicHoliday,
} from "@/lib/thaiPublicHolidays";

export function holidaysTitle(holidays: ThaiPublicHoliday[]): string {
  return holidays.map((h) => h.name_th).join("\n");
}

const MONTH_CELL_HOLIDAY_NAME_MAX = 100;

/** ข้อความบรรทัดเดียวในช่องปฏิทินรายเดือน — ไม่ขยายความสูงช่อง */
export function holidaysCompactLabel(holidays: ThaiPublicHoliday[]): string {
  if (holidays.length === 0) return "";
  if (holidays.length === 1) return shortHolidayLabel(holidays[0].name_th, MONTH_CELL_HOLIDAY_NAME_MAX);
  const suffix = ` +${holidays.length - 1}`;
  const firstMax = Math.max(0, MONTH_CELL_HOLIDAY_NAME_MAX - suffix.length);
  return `${shortHolidayLabel(holidays[0].name_th, firstMax)}${suffix}`;
}

export function monthBookingCap(holidays: ThaiPublicHoliday[]): number {
  return holidays.length > 0 ? 2 : 3;
}

/** เน้นวันหยุดโดยไม่เปลี่ยน aspect-square */
export function calendarHolidayCellClasses(isHoliday: boolean, isSelected: boolean): string {
  if (!isHoliday || isSelected) return "";
  return "bg-rose-50/45 dark:bg-rose-950/20 ring-inset ring-1 ring-rose-300/45 dark:ring-rose-700/35";
}

export function CalendarHolidayMarker({ holidays }: { holidays: ThaiPublicHoliday[] }) {
  if (!holidays.length) return null;
  return (
    <div
      className="w-full shrink-0 text-[10px] leading-[11px] h-[11px] text-rose-800 dark:text-rose-200 font-semibold truncate pointer-events-none"
      title={holidaysTitle(holidays)}
    >
      {holidaysCompactLabel(holidays)}
    </div>
  );
}

export function CalendarHolidayWeekLine({ holidays }: { holidays: ThaiPublicHoliday[] }) {
  if (!holidays.length) return null;
  return (
    <div
      className="mb-0.5 px-0.5 text-[10px] leading-[11px] h-[11px] text-rose-800 dark:text-rose-200 font-semibold truncate"
      title={holidaysTitle(holidays)}
    >
      <span className="font-semibold">หยุด</span>{" "}
      {holidays.map((h) => shortHolidayLabel(h.name_th, MONTH_CELL_HOLIDAY_NAME_MAX)).join(" · ")}
    </div>
  );
}

export function CalendarHolidayLegendItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="h-2.5 w-2.5 rounded-sm bg-rose-200/90 border border-rose-400 dark:bg-rose-900 dark:border-rose-600" />
      <span className="text-[11px] text-muted-foreground">วันหยุดราชการ</span>
    </div>
  );
}

export function SelectedDayHolidayPanel({ holidays }: { holidays: ThaiPublicHoliday[] }) {
  if (!holidays.length) return null;
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/40 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-900 dark:text-rose-100">
        <Flag className="h-3.5 w-3.5 shrink-0" />
        วันหยุดราชการ
      </div>
      {holidays.map((h) => (
        <div key={`${h.date}-${h.name_th}`}>
          <p className="text-xs font-medium leading-snug">{h.name_th}</p>
          <p className="text-[10px] text-muted-foreground">{holidayTypeLabel(h.type)}</p>
        </div>
      ))}
    </div>
  );
}
