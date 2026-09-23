import { useState, useMemo, useEffect } from "react";
import {
  format, addMonths, addDays,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, getDay, isSameDay, isSameMonth,
} from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange,
  Clock, MapPin, User, Building, LayoutPanelLeft, ClipboardEdit, Flag,
} from "lucide-react";
import { useThaiPublicHolidays } from "@/hooks/useThaiPublicHolidays";
import { holidayTypeLabel, shortHolidayLabel } from "@/lib/thaiPublicHolidays";
import { cn } from "@/lib/utils";
import { ROOMS, ROOM_COLORS, resolveRoom, roomColorClass, roomMatchesFilter } from "@/lib/mockData";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import ReservationForm from "@/pages/ReservationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const WEEK_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

export type BookingPageLayout = "both" | "calendar" | "form";
const LAYOUT_STORAGE_KEY = "booking-page-layout";

function loadBookingPageLayout(): BookingPageLayout {
  try {
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (v === "both" || v === "calendar" || v === "form") return v;
  } catch {
    /* ignore */
  }
  return "both";
}

export default function PublicPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [calView, setCalView]           = useState<"month" | "week">("month");
  const [monthDate, setMonthDate]       = useState(() => new Date());
  const [weekStart, setWeekStart]       = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [selectedDay, setSelectedDay]   = useState<Date | null>(() => new Date());
  const [roomFilter, setRoomFilter]     = useState("all");
  const [pageLayout, setPageLayout]     = useState<BookingPageLayout>(loadBookingPageLayout);

  const setLayoutAndSave = (layout: BookingPageLayout) => {
    setPageLayout(layout);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  };

  const showCalendar = pageLayout === "both" || pageLayout === "calendar";
  const showForm = pageLayout === "both" || pageLayout === "form";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r: any) => r.status === "approved" || r.status === "pending");
      setReservations(data);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() =>
    roomFilter === "all" ? reservations : reservations.filter((r) => roomMatchesFilter(r.room, roomFilter)),
    [reservations, roomFilter]
  );

  const getBookingsForDay = (day: Date) =>
    filtered.filter((r) => r.date && isSameDay(new Date(r.date), day));

  const selectedBookings = useMemo(() =>
    selectedDay
      ? filtered
          .filter((r) => r.date && isSameDay(new Date(r.date), selectedDay))
          .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
      : [],
    [selectedDay, filtered]
  );

  const { days, padStart } = useMemo(() => {
    const first = startOfMonth(monthDate);
    return {
      days:     eachDayOfInterval({ start: first, end: endOfMonth(monthDate) }),
      padStart: getDay(first),
    };
  }, [monthDate]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const beYear = (d: Date) => d.getFullYear() + 543;

  const holidayYears = useMemo(() => {
    const years = new Set<number>();
    years.add(monthDate.getFullYear());
    weekDays.forEach((d) => years.add(d.getFullYear()));
    return [...years];
  }, [monthDate, weekStart]);

  const { getHolidaysForDay, loading: holidaysLoading } = useThaiPublicHolidays(holidayYears);

  const selectedDayHolidays = useMemo(
    () => (selectedDay ? getHolidaysForDay(selectedDay) : []),
    [selectedDay, getHolidaysForDay],
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 md:px-5 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 max-w-[1600px] mx-auto">
          <p className="text-xs text-muted-foreground sm:text-sm">มุมมองหน้าจอง</p>
          <div className="flex rounded-lg border overflow-hidden w-full sm:w-auto">
            <Button
              type="button"
              variant={pageLayout === "both" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9 flex-1 sm:flex-none px-3 text-xs gap-1.5"
              onClick={() => setLayoutAndSave("both")}
            >
              <LayoutPanelLeft className="h-3.5 w-3.5 shrink-0" />
              ทั้งคู่
            </Button>
            <Button
              type="button"
              variant={pageLayout === "calendar" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9 flex-1 sm:flex-none px-3 text-xs gap-1.5 border-x"
              onClick={() => setLayoutAndSave("calendar")}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              ปฏิทิน
            </Button>
            <Button
              type="button"
              variant={pageLayout === "form" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9 flex-1 sm:flex-none px-3 text-xs gap-1.5"
              onClick={() => setLayoutAndSave("form")}
            >
              <ClipboardEdit className="h-3.5 w-3.5 shrink-0" />
              แบบฟอร์ม
            </Button>
          </div>
        </div>
      </div>

    <div
      className={cn(
        "flex flex-col flex-1",
        pageLayout === "both" && "xl:flex-row xl:items-start",
      )}
    >

      {/* ===== Calendar ===== */}
      {showCalendar && (
      <div
        className={cn(
          "w-full flex flex-col",
          pageLayout === "both" && "xl:w-[70%] xl:border-r",
          pageLayout === "calendar" && "max-w-6xl mx-auto",
        )}
      >
        <div className="p-3 md:p-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3 md:px-4">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">ตารางการจองห้องประชุม</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    วันหยุดราชการจาก{" "}
                    <a
                      href="https://github.com/ppraserts/thailand-open-data/tree/main/data/thai-public-holidays"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Thailand Open Data
                    </a>
                    {holidaysLoading && " · กำลังโหลด…"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex rounded-md border overflow-hidden">
                    <Button
                      variant={calView === "month" ? "default" : "ghost"}
                      size="sm" className="rounded-none h-8 px-2.5 text-xs"
                      onClick={() => setCalView("month")}
                    >
                      <CalendarDays className="h-3.5 w-3.5 mr-1" /> เดือน
                    </Button>
                    <Button
                      variant={calView === "week" ? "default" : "ghost"}
                      size="sm" className="rounded-none h-8 px-2.5 text-xs"
                      onClick={() => setCalView("week")}
                    >
                      <CalendarRange className="h-3.5 w-3.5 mr-1" /> สัปดาห์
                    </Button>
                  </div>
                  <Select value={roomFilter} onValueChange={setRoomFilter}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder="ทุกห้อง" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกห้องประชุม</SelectItem>
                      {ROOMS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Legend + Monthly Stats */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5">
                <div className="hidden sm:contents">
                  {ROOMS.map((r) => (
                    <div key={r.value} className="flex items-center gap-1">
                      <div className={cn("h-2.5 w-2.5 rounded-sm", ROOM_COLORS[r.value])} />
                      <span className="text-[11px] text-muted-foreground">{r.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 ml-1 pl-2 border-l">
                    <div className="h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground/60 bg-muted-foreground/25" />
                    <span className="text-[11px] text-muted-foreground">รออนุมัติ</span>
                  </div>
                  <div className="flex items-center gap-1 ml-1 pl-2 border-l">
                    <div className="h-2.5 w-2.5 rounded-sm bg-rose-200 border border-rose-400 dark:bg-rose-900 dark:border-rose-600" />
                    <span className="text-[11px] text-muted-foreground">วันหยุดราชการ</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800">
                    อนุมัติ: {reservations.filter((r) => {
                      if (!r.date) return false;
                      const d = new Date(r.date);
                      return r.status === "approved" && d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
                    }).length}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                    รอ: {reservations.filter((r) => {
                      if (!r.date) return false;
                      const d = new Date(r.date);
                      return r.status === "pending" && d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
                    }).length}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-3 md:px-4 pb-3 md:pb-4">

              {/* ===== MONTH VIEW ===== */}
              {calView === "month" && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <Button variant="outline" size="sm" onClick={() => setMonthDate(addMonths(monthDate, -1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold">
                      {format(monthDate, "MMMM", { locale: th })} {beYear(monthDate)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setMonthDate(addMonths(monthDate, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 mb-0.5">
                    {WEEK_LABELS.map((d, i) => (
                      <div key={d} className={cn(
                        "text-center text-xs font-semibold py-1",
                        i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                      )}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 border-l border-t rounded-md overflow-hidden">
                    {Array.from({ length: padStart }).map((_, i) => (
                      <div key={`pad-${i}`} className="border-r border-b aspect-square bg-muted/20" />
                    ))}
                    {days.map((day) => {
                      const bookings   = getBookingsForDay(day);
                      const dayHolidays = getHolidaysForDay(day);
                      const isHoliday  = dayHolidays.length > 0;
                      const bookingCap = isHoliday ? 2 : 3;
                      const isToday    = isSameDay(day, new Date());
                      const isSelected = !!selectedDay && isSameDay(day, selectedDay);
                      const inMonth    = isSameMonth(day, monthDate);
                      const isSun      = getDay(day) === 0;
                      const isSat      = getDay(day) === 6;
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "border-r border-b aspect-square p-1 flex flex-col gap-0.5 min-h-0",
                            "cursor-pointer transition-colors select-none",
                            !inMonth && "opacity-40 bg-muted/20",
                            isToday && !isSelected && "bg-primary/5",
                            isSelected && "bg-primary/15 ring-1 ring-inset ring-primary",
                            isHoliday && !isSelected && "bg-rose-50/90 dark:bg-rose-950/35 ring-inset ring-rose-200/80 dark:ring-rose-800/60",
                            !isSelected && !isToday && !isHoliday && isSun && "bg-red-50/70 hover:bg-red-100/60 dark:bg-red-950/30 dark:hover:bg-red-950/50",
                            !isSelected && !isToday && !isHoliday && isSat && "bg-blue-50/70 hover:bg-blue-100/60 dark:bg-blue-950/30 dark:hover:bg-blue-950/50",
                            !isSelected && !isToday && !isHoliday && !isSun && !isSat && "hover:bg-muted/40",
                          )}
                        >
                          <div className={cn(
                            "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full self-end mb-0.5",
                            isToday && "bg-primary text-primary-foreground",
                            isSelected && !isToday && "bg-primary/25 text-primary",
                            !isToday && !isSelected && isSun && "text-red-500",
                            !isToday && !isSelected && isSat && "text-blue-500",
                          )}>
                            {format(day, "d")}
                          </div>
                          {isHoliday && (
                            <div
                              className="text-[9px] leading-tight text-rose-800 dark:text-rose-200 font-medium truncate pointer-events-none"
                              title={dayHolidays.map((h) => h.name_th).join("\n")}
                            >
                              {shortHolidayLabel(dayHolidays[0].name_th, 11)}
                            </div>
                          )}
                          {bookings.slice(0, bookingCap).map((r) => (
                            <div key={r.id}
                              className={cn(
                                "rounded px-1 py-0.5 text-[10px] leading-tight truncate pointer-events-none",
                                r.status === "pending"
                                  ? "bg-muted-foreground/25 text-foreground border border-dashed border-muted-foreground/50"
                                  : cn("text-white", roomColorClass(r.room))
                              )}
                            >
                              {r.status === "pending" && "⧖ "}{r.startTime} {resolveRoom(r.room)}
                            </div>
                          ))}
                          {bookings.length > bookingCap && (
                            <div className="text-[10px] text-muted-foreground pl-0.5">+{bookings.length - bookingCap} รายการ</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ===== WEEK VIEW (Gantt) ===== */}
              {calView === "week" && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> ก่อน
                    </Button>
                    <span className="text-sm font-semibold">
                      {format(weekDays[0], "d MMM", { locale: th })} — {format(weekDays[6], "d MMM", { locale: th })} {beYear(weekDays[6])}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                      ถัดไป <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  {/* Time ruler */}
                  <div className="flex mb-1">
                    <div className="w-[82px] flex-shrink-0" />
                    <div className="flex-1 relative h-5">
                      {HOURS.map((h) => (
                        <span key={h}
                          className="absolute text-[10px] text-muted-foreground -translate-x-1/2 select-none"
                          style={{ left: `${((h - 8) / 10) * 100}%` }}
                        >
                          {h.toString().padStart(2, "0")}:00
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Day rows */}
                  <div className="space-y-1">
                    {weekDays.map((day) => {
                      const bookings   = getBookingsForDay(day);
                      const dayHolidays = getHolidaysForDay(day);
                      const isHoliday  = dayHolidays.length > 0;
                      const isToday    = isSameDay(day, new Date());
                      const isSelected = !!selectedDay && isSameDay(day, selectedDay);
                      const isSun      = getDay(day) === 0;
                      const isSat      = getDay(day) === 6;
                      const isWeekend  = isSun || isSat;
                      return (
                        <div key={day.toISOString()}
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "flex items-start gap-1.5 rounded-lg border px-2 py-1.5",
                            "cursor-pointer transition-colors select-none",
                            isToday && !isSelected && "border-primary/40 bg-primary/5",
                            isSelected && "border-primary bg-primary/10",
                            isHoliday && !isSelected && "border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30",
                            !isToday && !isSelected && !isHoliday && isSun && "border-red-200 bg-red-50/50 hover:bg-red-100/50 dark:border-red-900 dark:bg-red-950/25 dark:hover:bg-red-950/40",
                            !isToday && !isSelected && !isHoliday && isSat && "border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-900 dark:bg-blue-950/25 dark:hover:bg-blue-950/40",
                            !isToday && !isSelected && !isHoliday && !isWeekend && "border-border hover:bg-muted/30",
                          )}
                        >
                          <div className="w-[70px] flex-shrink-0 text-right pr-1 pt-0.5">
                            <div className={cn(
                              "text-[10px] font-medium",
                              isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-muted-foreground"
                            )}>{format(day, "EEE", { locale: th })}</div>
                            <div className={cn(
                              "text-lg font-bold leading-none",
                              isToday ? "text-primary" : isSun ? "text-red-500" : isSat ? "text-blue-500" : ""
                            )}>{format(day, "d")}</div>
                            <div className="text-[9px] text-muted-foreground">{format(day, "MMM", { locale: th })} {(day.getFullYear() + 543) % 100}</div>
                            {isHoliday && (
                              <div className="text-[8px] text-rose-700 dark:text-rose-300 leading-tight mt-0.5 truncate" title={dayHolidays[0].name_th}>
                                {shortHolidayLabel(dayHolidays[0].name_th, 8)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden relative">
                            {isHoliday && dayHolidays.length > 0 && (
                              <div className="mb-1 flex items-start gap-1 text-[10px] text-rose-800 dark:text-rose-200">
                                <Flag className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="leading-snug">{dayHolidays.map((h) => h.name_th).join(" · ")}</span>
                              </div>
                            )}
                            {bookings.length === 0 && !isHoliday ? (
                              <div className="h-5 flex items-center">
                                <span className="text-[10px] text-muted-foreground italic">ไม่มีการจอง</span>
                              </div>
                            ) : bookings.length === 0 ? null : (
                              <div className="space-y-0.5">
                                {bookings
                                  .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
                                  .map((r) => {
                                    const sh = parseInt(r.startTime?.split(":")[0] ?? "8");
                                    const sm2 = parseInt(r.startTime?.split(":")[1] ?? "0");
                                    const eh = parseInt(r.endTime?.split(":")[0] ?? "9");
                                    const em = parseInt(r.endTime?.split(":")[1] ?? "0");
                                    const totalMins = 10 * 60;
                                    const leftPct  = ((sh - 8) * 60 + sm2) / totalMins * 100;
                                    const widthPct = Math.max(5, (eh - sh) * 60 + (em - sm2)) / totalMins * 100;
                                    const isPending = r.status === "pending";
                                    return (
                                      <div key={r.id} className="relative h-5">
                                        <div
                                          className={cn(
                                            "absolute top-0 bottom-0 rounded flex items-center px-1",
                                            "text-[9px] font-medium overflow-hidden shadow-sm",
                                            "cursor-pointer group/bar relative",
                                            isPending
                                              ? "bg-muted-foreground/25 text-foreground border border-dashed border-muted-foreground/50"
                                              : cn("text-white", roomColorClass(r.room))
                                          )}
                                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                        >
                                          <span className="truncate">{isPending && "⧖ "}{resolveRoom(r.room)} {r.startTime}–{r.endTime}</span>
                                          {/* Tooltip on hover */}
                                          <div className="hidden group-hover/bar:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-56 p-2 rounded-lg shadow-lg border bg-popover text-popover-foreground text-[11px] pointer-events-none">
                                            <div className="font-semibold text-xs mb-1 truncate">{r.topic}</div>
                                            <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {r.startTime}–{r.endTime} น.</div>
                                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5"><MapPin className="h-3 w-3" /> {resolveRoom(r.room)}</div>
                                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5"><User className="h-3 w-3" /> {r.bookerName}</div>
                                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5"><Building className="h-3 w-3" /> {r.department}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ===== SELECTED DAY DETAIL (month view only) ===== */}
              {calView === "month" && <div className="mt-3 border-t pt-2 bg-transparent">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    {selectedDay
                      ? `${format(selectedDay, "EEEE d MMMM", { locale: th })} ${beYear(selectedDay)}`
                      : "คลิกวันที่เพื่อดูรายละเอียด"}
                  </h3>
                  {selectedDay && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{selectedBookings.length} รายการ</Badge>
                  )}
                </div>
                {!selectedDay ? (
                  <p className="text-xs text-muted-foreground italic text-center py-2">
                    คลิกที่วันในปฏิทินเพื่อดูรายการจอง
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayHolidays.length > 0 && (
                      <div className="rounded-md border border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/40 p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-900 dark:text-rose-100">
                          <Flag className="h-3.5 w-3.5" />
                          วันหยุดราชการ
                        </div>
                        {selectedDayHolidays.map((h) => (
                          <div key={`${h.date}-${h.name_th}`} className="text-xs">
                            <p className="font-medium leading-snug">{h.name_th}</p>
                            <p className="text-[10px] text-muted-foreground">{holidayTypeLabel(h.type)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedBookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-2">ไม่มีการจองในวันนี้</p>
                    ) : (
                  <div className="space-y-1.5">
                    {selectedBookings.map((r) => (
                      <div key={r.id}
                        className={cn(
                          "rounded-md border p-2 space-y-1 bg-transparent",
                          r.status === "pending"
                            ? "border-dashed border-muted-foreground/40 bg-muted/20"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold leading-snug">{r.topic}</span>
                          <Badge
                            variant={r.status === "approved" ? "default" : "secondary"}
                            className="text-[10px] h-5 flex-shrink-0"
                          >
                            {r.status === "approved" ? "อนุมัติแล้ว" : "รออนุมัติ"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{r.startTime}–{r.endTime} น.</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", roomColorClass(r.room, true))}>
                              {resolveRoom(r.room)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{r.bookerName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{r.department}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                    )}
                  </div>
                )}
                {/* Summary */}

              </div>}

            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* ===== Booking form ===== */}
      {showForm && (
      <div
        className={cn(
          "w-full px-3 md:px-5 pt-3 md:pt-5 pb-3 md:pb-5",
          pageLayout === "both" && "xl:w-[30%] xl:self-start xl:sticky xl:top-[52px]",
          pageLayout === "form" && "max-w-3xl mx-auto flex-1",
        )}
      >
        <ReservationForm />
      </div>
      )}
    </div>
    </div>
  );
}
