import { useEffect, useMemo, useState } from "react";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  getDay,
  isSameMonth,
} from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Clock,
  MapPin,
  User,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateRangeShortBE,
  formatDateThaiBE,
  formatDateThaiFullBE,
  formatMonthYearCompactBE,
  formatMonthYearThaiBE,
} from "@/lib/thaiDate";
import { useThaiPublicHolidays } from "@/hooks/useThaiPublicHolidays";
import {
  CalendarHolidayMarker,
  CalendarHolidayWeekLine,
  CalendarHolidayLegendItem,
  SelectedDayHolidayPanel,
  calendarHolidayCellClasses,
  monthBookingCap,
} from "@/components/calendar/calendarHolidayUi";
import { resolveRoom, reservationUsesVcs, roomColorClass, roomMatchesFilter } from "@/lib/mockData";
import { roomSolidColorClass } from "@/lib/meetingRooms";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const WEEK_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type ReservationRow = {
  id: string;
  status?: string;
  room?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  department?: string;
  bookerName?: string;
  equipment?: unknown;
};

export default function AdminVcsSchedule() {
  const { toast } = useToast();
  const { activeRooms, allRooms } = useMeetingRooms();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [roomFilter, setRoomFilter] = useState("all");
  const [calendarView, setCalendarView] = useState<"week" | "month">("month");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "reservations"),
      (snapshot) => {
        setReservations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ReservationRow));
      },
      (error) => {
        console.error(error);
        toast({
          title: "โหลดข้อมูลไม่สำเร็จ",
          variant: "destructive",
        });
      },
    );
    return () => unsub();
  }, [toast]);

  const vcsReservations = useMemo(
    () =>
      reservations.filter(
        (r) =>
          reservationUsesVcs(r) &&
          r.status !== "rejected" &&
          (r.status === "approved" || r.status === "pending"),
      ),
    [reservations],
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const holidayYears = useMemo(() => {
    const y = new Set<number>();
    y.add(monthDate.getFullYear());
    weekDays.forEach((d) => y.add(d.getFullYear()));
    return Array.from(y);
  }, [monthDate, weekStart]);

  const { getHolidaysForDay } = useThaiPublicHolidays(holidayYears);
  const selectedDayHolidays = getHolidaysForDay(selectedDay);

  const calendarReservations = useMemo(() => {
    if (roomFilter === "all") return vcsReservations;
    return vcsReservations.filter((r) => roomMatchesFilter(r.room ?? "", roomFilter, allRooms));
  }, [vcsReservations, roomFilter, allRooms]);

  const getBookingsForDay = (day: Date) =>
    calendarReservations.filter((r) => r.date && isSameDay(new Date(r.date), day));

  const selectedDayBookings = useMemo(
    () =>
      calendarReservations
        .filter((r) => r.date && isSameDay(new Date(r.date), selectedDay))
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [calendarReservations, selectedDay],
  );

  const monthDays = useMemo(() => {
    const first = startOfMonth(monthDate);
    const days = eachDayOfInterval({ start: first, end: endOfMonth(monthDate) });
    return { days, padStart: getDay(first) };
  }, [monthDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Video className="h-7 w-7 text-primary" />
          ระบบประชุมวีดิทัศน์ทางไกล (VCS)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          แสดงเฉพาะการจองที่เลือกอุปกรณ์ VCS — วัน เวลา และห้องประชุม
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-xl">ตารางใช้งาน VCS</CardTitle>
                <CardDescription>
                  {vcsReservations.length} รายการที่ขอใช้ VCS (อนุมัติแล้วและรออนุมัติ)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-md border overflow-hidden">
                  <Button
                    variant={calendarView === "month" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none h-8 px-3"
                    onClick={() => setCalendarView("month")}
                  >
                    <CalendarDays className="h-4 w-4 mr-1" /> เดือน
                  </Button>
                  <Button
                    variant={calendarView === "week" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none h-8 px-3"
                    onClick={() => setCalendarView("week")}
                  >
                    <CalendarRange className="h-4 w-4 mr-1" /> สัปดาห์
                  </Button>
                </div>
                <Select value={roomFilter} onValueChange={setRoomFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="กรองตามห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกห้องประชุม</SelectItem>
                    {activeRooms.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {activeRooms.map((r) => (
                <div key={r.value} className="flex items-center gap-1.5">
                  <div className={cn("h-3 w-3 rounded-sm", roomSolidColorClass(r.colorKey))} />
                  <span className="text-xs text-muted-foreground">{r.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
                <div className="h-3 w-3 rounded-sm bg-muted-foreground/40 border border-dashed border-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">รออนุมัติ</span>
              </div>
              <CalendarHolidayLegendItem className="ml-2 pl-2 border-l" />
            </div>
          </CardHeader>
          <CardContent>
            {calendarView === "month" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={() => setMonthDate(addMonths(monthDate, -1))}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> เดือนก่อน
                  </Button>
                  <span className="text-sm font-semibold">{formatMonthYearThaiBE(monthDate)}</span>
                  <Button variant="outline" size="sm" onClick={() => setMonthDate(addMonths(monthDate, 1))}>
                    เดือนถัดไป <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_LABELS.map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        "text-center text-xs font-semibold py-1",
                        i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground",
                      )}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 border-l border-t">
                  {Array.from({ length: monthDays.padStart }).map((_, i) => (
                    <div key={`pad-${i}`} className="border-r border-b aspect-square bg-muted/30" />
                  ))}
                  {monthDays.days.map((day) => {
                    const bookings = getBookingsForDay(day);
                    const dayHolidays = getHolidaysForDay(day);
                    const isHoliday = dayHolidays.length > 0;
                    const bookingCap = monthBookingCap(dayHolidays);
                    const isSelected = isSameDay(day, selectedDay);
                    const isToday = isSameDay(day, new Date());
                    const isSun = getDay(day) === 0;
                    const isSat = getDay(day) === 6;
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "border-r border-b aspect-square p-1 flex flex-col gap-0.5 min-h-0 overflow-hidden cursor-pointer transition-colors",
                          !isSameMonth(day, monthDate) && "bg-muted/30",
                          isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                          !isSelected && isToday && "bg-primary/5",
                          calendarHolidayCellClasses(isHoliday, isSelected),
                          !isSelected && !isToday && !isHoliday && isSun && "bg-red-50/70",
                          !isSelected && !isToday && !isHoliday && isSat && "bg-blue-50/70",
                          !isSelected && "hover:bg-muted/50",
                        )}
                        onClick={() => setSelectedDay(day)}
                      >
                        <div
                          className={cn(
                            "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 self-end",
                            isToday && !isSelected && "bg-primary text-primary-foreground",
                            isSelected && "bg-primary text-primary-foreground ring-2 ring-primary/50",
                            !isToday && !isSelected && isSun && "text-red-500",
                            !isToday && !isSelected && isSat && "text-blue-500",
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        <CalendarHolidayMarker holidays={dayHolidays} />
                        {bookings.slice(0, bookingCap).map((r) => (
                          <div
                            key={r.id}
                            title={`${r.topic}\n${resolveRoom(r.room ?? "")} | ${r.startTime}-${r.endTime}`}
                            className={cn(
                              "rounded px-1 py-0.5 text-[10px] leading-tight truncate",
                              r.status === "pending"
                                ? "bg-muted-foreground/30 border border-dashed border-muted-foreground/50"
                                : cn("text-white", roomColorClass(r.room ?? "", false, allRooms)),
                            )}
                          >
                            {r.status === "pending" && "⧖ "}
                            {r.startTime} {resolveRoom(r.room ?? "")}
                          </div>
                        ))}
                        {bookings.length > bookingCap && (
                          <div className="text-[10px] text-muted-foreground pl-1">
                            +{bookings.length - bookingCap} รายการ
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {calendarView === "week" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> สัปดาห์ก่อน
                  </Button>
                  <span className="text-sm font-medium">{formatDateRangeShortBE(weekDays[0], weekDays[6])}</span>
                  <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    สัปดาห์ถัดไป <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="flex mb-1">
                  <div className="w-[94px] shrink-0" />
                  <div className="flex-1 relative h-5">
                    {HOURS.map((h) => (
                      <span
                        key={h}
                        className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                        style={{ left: `${((h - 8) / 10) * 100}%` }}
                      >
                        {h.toString().padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  {weekDays.map((day) => {
                    const bookings = getBookingsForDay(day);
                    const dayHolidays = getHolidaysForDay(day);
                    const isHoliday = dayHolidays.length > 0;
                    const isToday = isSameDay(day, new Date());
                    const isSun = getDay(day) === 0;
                    const isSat = getDay(day) === 6;
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border px-2 py-1.5",
                          isToday && "border-primary/50 bg-primary/5",
                          isHoliday && !isToday && "border-rose-200/80 bg-rose-50/40",
                          !isToday && !isHoliday && isSun && "border-red-200 bg-red-50/50",
                          !isToday && !isHoliday && isSat && "border-blue-200 bg-blue-50/50",
                        )}
                      >
                        <div className="w-[80px] shrink-0 text-right pr-1 pt-0.5">
                          <div className="text-[10px] font-semibold text-muted-foreground">
                            {format(day, "EEE", { locale: th })}
                          </div>
                          <div className="text-lg font-bold leading-none">{format(day, "d")}</div>
                          <div className="text-[9px] text-muted-foreground">{formatMonthYearCompactBE(day)}</div>
                        </div>
                        <div className="flex-1 min-w-0 relative">
                          <CalendarHolidayWeekLine holidays={dayHolidays} />
                          {bookings.length === 0 ? (
                            <div className="h-6 flex items-center">
                              <span className="text-xs text-muted-foreground italic">ไม่มีการใช้ VCS</span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              {bookings.map((r) => {
                                const startH = parseInt(r.startTime?.split(":")[0] ?? "8", 10);
                                const startM = parseInt(r.startTime?.split(":")[1] ?? "0", 10);
                                const endH = parseInt(r.endTime?.split(":")[0] ?? "9", 10);
                                const endM = parseInt(r.endTime?.split(":")[1] ?? "0", 10);
                                const totalMins = 10 * 60;
                                const startMins = (startH - 8) * 60 + startM;
                                const durMins = Math.max(30, (endH - startH) * 60 + (endM - startM));
                                const leftPct = (startMins / totalMins) * 100;
                                const widthPct = (durMins / totalMins) * 100;
                                const isPending = r.status === "pending";
                                return (
                                  <div key={r.id} className="relative h-5">
                                    <div
                                      className={cn(
                                        "absolute top-0 bottom-0 rounded flex items-center px-1.5 text-[10px] font-medium overflow-hidden shadow-sm",
                                        isPending
                                          ? "bg-muted-foreground/30 border border-dashed border-muted-foreground/60"
                                          : cn("text-white", roomColorClass(r.room ?? "", false, allRooms)),
                                      )}
                                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                      title={`${r.topic} · ${resolveRoom(r.room ?? "")}`}
                                    >
                                      <span className="truncate">
                                        {isPending && "⧖ "}
                                        {resolveRoom(r.room ?? "")} · {r.startTime}–{r.endTime}
                                      </span>
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              รายการใช้ VCS ประจำวัน
            </CardTitle>
            <CardDescription>{formatDateThaiFullBE(selectedDay)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SelectedDayHolidayPanel holidays={selectedDayHolidays} />
            {selectedDayBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">ไม่มีการจองที่ใช้ VCS ในวันนี้</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{selectedDayBookings.length} รายการ</p>
                {selectedDayBookings.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-lg border p-3 space-y-1.5",
                      r.status === "pending" ? "border-dashed bg-muted/30" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          r.status !== "pending" && roomColorClass(r.room ?? "", true, allRooms),
                        )}
                      >
                        {resolveRoom(r.room ?? "")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        VCS
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {r.startTime}–{r.endTime} น.
                      {r.date ? ` · ${formatDateThaiBE(r.date)}` : ""}
                    </div>
                    <p className="text-sm font-medium leading-snug">{r.topic}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {r.bookerName}
                      </span>
                    </div>
                    {r.status === "pending" && (
                      <Badge variant="secondary" className="text-[10px]">
                        รออนุมัติ
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
