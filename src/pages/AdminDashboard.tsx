import { useState, useMemo, useEffect } from "react";
import {
  format, addDays, startOfWeek, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, getDay, isSameMonth,
} from "date-fns";
import { th } from "date-fns/locale";
import { Check, X, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Clock, MapPin, User, Download } from "lucide-react";
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
import { resolveRoom, roomColorClass, roomMatchesFilter } from "@/lib/mockData";
import { roomSolidColorClass } from "@/lib/meetingRooms";
import { canApproveRoom } from "@/lib/adminAccess";
import { useAdminProfile } from "@/contexts/AdminProfileContext";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8-18
const WEEK_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { profile } = useAdminProfile();
  const { activeRooms, allRooms } = useMeetingRooms();
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomFilter, setRoomFilter] = useState("all");
  const [calendarView, setCalendarView] = useState<"week" | "month">("month");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [pendingPage, setPendingPage] = useState(1);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const ITEMS_PER_PAGE = 5;

  // Real-time Firestore listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "reservations"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReservations(data);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่",
          variant: "destructive",
        });
      }
    );
    return () => unsubscribe();
  }, []);

  const pendingReservations = reservations.filter(
    (r) => r.status === "pending" && canApproveRoom(profile, r.room),
  );
  const approvedReservations = reservations.filter((r) => r.status === "approved");
  const totalPendingPages = Math.max(1, Math.ceil(pendingReservations.length / ITEMS_PER_PAGE));
  const paginatedPending = pendingReservations.slice((pendingPage - 1) * ITEMS_PER_PAGE, pendingPage * ITEMS_PER_PAGE);

  const handleUpdateStatus = async (
    id: string,
    newStatus: "approved" | "rejected",
    room: string,
  ) => {
    if (!canApproveRoom(profile, room)) {
      toast({
        title: "ไม่มีสิทธิ์",
        description: "คุณไม่ได้รับอนุญาตให้อนุมัติห้องประชุมนี้",
        variant: "destructive",
      });
      return;
    }
    try {
      if (newStatus === "approved") {
        await updateDoc(doc(db, "reservations", id), { status: "approved" });
        toast({ title: "อนุมัติแล้ว", description: "รายการจองได้รับการอนุมัติเรียบร้อย" });
      } else {
        // ปฏิเสธ → ลบออกจากฐานข้อมูลเลย
        await deleteDoc(doc(db, "reservations", id));
        toast({ title: "ปฏิเสธและลบแล้ว", description: "รายการจองถูกปฏิเสธและลบออกจากระบบแล้ว", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดำเนินการได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    }
  };

  const handleExportBackup = async () => {
    try {
      const snap = await getDocs(collection(db, "reservations"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_reservations_${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "สำรองข้อมูลสำเร็จ", description: `ดาวน์โหลดไฟล์ JSON ${data.length} รายการ` });
    } catch (err) {
      console.error(err);
      toast({ title: "สำรองข้อมูลไม่สำเร็จ", variant: "destructive" });
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const holidayYears = useMemo(() => {
    const y = new Set<number>();
    y.add(monthDate.getFullYear());
    weekDays.forEach((d) => y.add(d.getFullYear()));
    return Array.from(y);
  }, [monthDate, weekStart]);

  const { getHolidaysForDay } = useThaiPublicHolidays(holidayYears);
  const selectedDayHolidays = getHolidaysForDay(selectedDay);

  // รวมทั้ง approved และ pending ไว้แสดงในปฏิทิน
  const calendarReservations = useMemo(() => {
    const base = reservations.filter((r) => r.status === "approved" || r.status === "pending");
    if (roomFilter === "all") return base;
    return base.filter((r) => roomMatchesFilter(r.room, roomFilter, allRooms));
  }, [reservations, roomFilter, allRooms]);

  const getBookingsForDay = (day: Date) =>
    calendarReservations.filter((r) => {
      if (!r.date) return false;
      return isSameDay(new Date(r.date), day);
    });

  // Bookings for selected day (for the side card)
  const selectedDayBookings = useMemo(() => {
    return reservations
      .filter((r) => {
        if (!r.date) return false;
        if (r.status !== "approved" && r.status !== "pending") return false;
        if (roomFilter !== "all" && !roomMatchesFilter(r.room, roomFilter, allRooms)) return false;
        return isSameDay(new Date(r.date), selectedDay);
      })
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }, [reservations, selectedDay, roomFilter, allRooms]);

  const getBlockStyle = (r: any) => {
    const startH = parseInt(r.startTime?.split(":")[0] ?? "8");
    const startM = parseInt(r.startTime?.split(":")[1] ?? "0");
    const endH = parseInt(r.endTime?.split(":")[0] ?? "9");
    const endM = parseInt(r.endTime?.split(":")[1] ?? "0");
    const top = ((startH - 8) + startM / 60) * 4;
    const height = ((endH - startH) + (endM - startM) / 60) * 4;
    return { top: `${top}rem`, height: `${height}rem` };
  };

  // --- Month calendar helpers ---
  const monthDays = useMemo(() => {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: first, end: last });
    // padding ด้านหน้า (จันทร์ = 0)
    const padStart = getDay(first);
    return { days, padStart };
  }, [monthDate]);

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">รายการรออนุมัติ</CardTitle>
              <CardDescription>
                {pendingReservations.length} รายการที่รอดำเนินการ (หน้า {pendingPage}/{totalPendingPages})
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={handleExportBackup}
            >
              <Download className="h-4 w-4" />
              Backup (JSON)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ไม่มีรายการรออนุมัติ</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หน่วยงาน</TableHead>
                    <TableHead>เรื่อง</TableHead>
                    <TableHead>ห้อง</TableHead>
                    <TableHead>วัน/เวลา</TableHead>
                    <TableHead>ผู้จอง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPending.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">{r.department}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{r.topic}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", roomColorClass(r.room, true, allRooms))}>
                          {resolveRoom(r.room)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.date ? formatDateThaiBE(r.date) : "-"}
                        <br />
                        {r.startTime}-{r.endTime}
                      </TableCell>
                      <TableCell className="text-xs">{r.bookerName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">รออนุมัติ</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-[hsl(var(--room-green))]"
                            onClick={() => handleUpdateStatus(r.id, "approved", r.room)}
                          >
                            <Check className="h-3 w-3 mr-1" /> อนุมัติ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive"
                            onClick={() => handleUpdateStatus(r.id, "rejected", r.room)}
                          >
                            <X className="h-3 w-3 mr-1" /> ปฏิเสธ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination */}
          {totalPendingPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={pendingPage <= 1} onClick={() => setPendingPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">หน้า {pendingPage} / {totalPendingPages}</span>
              <Button variant="outline" size="sm" disabled={pendingPage >= totalPendingPages} onClick={() => setPendingPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar + Daily Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar View */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">ตารางการจอง</CardTitle>
              <CardDescription>
                ภาพรวมการจองห้องประชุม{calendarView === "week" ? "รายสัปดาห์" : "รายเดือน"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle week/month */}
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
                    <SelectItem key={r.value} value={r.value}>{r.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Room legend */}
          <div className="flex flex-wrap gap-2 pt-2">
            {activeRooms.map((r) => (
              <div key={r.value} className="flex items-center gap-1.5">
                <div className={cn("h-3 w-3 rounded-sm", roomSolidColorClass(r.colorKey))} />
                <span className="text-xs text-muted-foreground">{r.value}</span>
              </div>
            ))}
            {/* pending legend */}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
              <div className="h-3 w-3 rounded-sm bg-muted-foreground/40 border border-dashed border-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">รออนุมัติ</span>
            </div>
            <CalendarHolidayLegendItem className="ml-2 pl-2 border-l" />
          </div>
        </CardHeader>
        <CardContent>
          {/* ===== MONTH VIEW ===== */}
          {calendarView === "month" && (
            <>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={() => setMonthDate(addMonths(monthDate, -1))}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> เดือนก่อน
                </Button>
                <span className="text-sm font-semibold">
                  {formatMonthYearThaiBE(monthDate)}
                </span>
                <Button variant="outline" size="sm" onClick={() => setMonthDate(addMonths(monthDate, 1))}>
                  เดือนถัดไป <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEK_LABELS.map((d, i) => (
                  <div key={d} className={cn(
                    "text-center text-xs font-semibold py-1",
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                  )}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 border-l border-t">
                {/* Padding cells */}
                {Array.from({ length: monthDays.padStart }).map((_, i) => (
                  <div key={`pad-${i}`} className="border-r border-b aspect-square bg-muted/30" />
                ))}

                {/* Day cells */}
                {monthDays.days.map((day) => {
                  const bookings = getBookingsForDay(day);
                  const dayHolidays = getHolidaysForDay(day);
                  const isHoliday = dayHolidays.length > 0;
                  const bookingCap = monthBookingCap(dayHolidays);
                  const isSelected = isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, new Date());
                  const isSun   = getDay(day) === 0;
                  const isSat   = getDay(day) === 6;
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
                      {/* Date number */}
                      <div
                        className={cn(
                          "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 self-end cursor-pointer transition-colors",
                          isToday && !isSameDay(day, selectedDay) && "bg-primary text-primary-foreground",
                          isSameDay(day, selectedDay) && "bg-primary text-primary-foreground ring-2 ring-primary/50",
                          !isToday && !isSameDay(day, selectedDay) && isSun && "text-red-500",
                          !isToday && !isSameDay(day, selectedDay) && isSat && "text-blue-500",
                          !isSameDay(day, selectedDay) && "hover:bg-muted",
                        )}
                        onClick={() => setSelectedDay(day)}
                      >
                        {format(day, "d")}
                      </div>

                      <CalendarHolidayMarker holidays={dayHolidays} />

                      {/* Booking chips (max 3, rest collapsed) */}
                      {bookings.slice(0, bookingCap).map((r) => (
                        <div
                          key={r.id}
                          title={`${r.topic}\n${resolveRoom(r.room)} | ${r.startTime}-${r.endTime}\n${r.bookerName}${
                            r.status === "pending" ? "\n[รออนุมัติ]" : ""
                          }`}
                          className={cn(
                            "rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-default",
                            r.status === "pending"
                              ? "bg-muted-foreground/30 text-foreground border border-dashed border-muted-foreground/50"
                              : cn("text-white", roomColorClass(r.room, false, allRooms))
                          )}
                        >
                          {r.status === "pending" && "⧖ "}{r.startTime} {resolveRoom(r.room)}
                        </div>
                      ))}
                      {bookings.length > bookingCap && (
                        <div className="text-[10px] text-muted-foreground pl-1">+{bookings.length - bookingCap} รายการ</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ===== WEEK VIEW (Horizontal Gantt per Day) ===== */}
          {calendarView === "week" && (
            <>
              {/* Week navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> สัปดาห์ก่อน
                </Button>
                <span className="text-sm font-medium">
                  {formatDateRangeShortBE(weekDays[0], weekDays[6])}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  สัปดาห์ถัดไป <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Time ruler */}
              <div className="flex mb-1">
                <div className="w-[94px] flex-shrink-0" />
                <div className="flex-1 relative h-5">
                  {HOURS.map((h) => {
                    const pct = ((h - 8) / 10) * 100;
                    return (
                      <span
                        key={h}
                        className="absolute text-[10px] text-muted-foreground -translate-x-1/2 select-none"
                        style={{ left: `${pct}%` }}
                      >
                        {h.toString().padStart(2, "0")}:00
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Day rows */}
              <div className="space-y-1">
                {weekDays.map((day) => {
                  const bookings = getBookingsForDay(day);
                  const dayHolidays = getHolidaysForDay(day);
                  const isHoliday = dayHolidays.length > 0;
                  const isToday = isSameDay(day, new Date());
                  const isSun   = getDay(day) === 0;
                  const isSat   = getDay(day) === 6;
                  const isWeekend = isSun || isSat;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-2 py-1.5",
                        isToday && "border-primary/50 bg-primary/5",
                        isHoliday && !isToday && "border-rose-200/80 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20",
                        !isToday && !isHoliday && isSun && "border-red-200 bg-red-50/50",
                        !isToday && !isHoliday && isSat && "border-blue-200 bg-blue-50/50",
                        !isToday && !isHoliday && !isWeekend && "border-border",
                      )}
                    >
                      {/* Day label */}
                      <div className="w-[80px] flex-shrink-0 text-right pr-1 pt-0.5">
                        <div className={cn(
                          "text-[10px] font-semibold",
                          isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-muted-foreground"
                        )}>
                          {format(day, "EEE", { locale: th })}
                        </div>
                        <div className={cn(
                          "text-lg font-bold leading-none",
                          isToday ? "text-primary" : isSun ? "text-red-500" : isSat ? "text-blue-500" : ""
                        )}>
                          {format(day, "d")}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {formatMonthYearCompactBE(day)}
                        </div>
                      </div>

                      {/* Gantt timeline */}
                      <div className="flex-1 min-w-0 overflow-hidden relative">
                        <CalendarHolidayWeekLine holidays={dayHolidays} />
                        {/* Booking bars */}
                        {bookings.length === 0 && !isHoliday ? (
                          <div className="h-6 flex items-center">
                            <span className="text-xs text-muted-foreground italic">ไม่มีการจอง</span>
                          </div>
                        ) : bookings.length === 0 ? null : (
                          <div className="space-y-0.5">
                            {bookings.map((r) => {
                              const startH = parseInt(r.startTime?.split(":")[0] ?? "8");
                              const startM = parseInt(r.startTime?.split(":")[1] ?? "0");
                              const endH   = parseInt(r.endTime?.split(":")[0]   ?? "9");
                              const endM   = parseInt(r.endTime?.split(":")[1]   ?? "0");
                              const totalMins = 10 * 60; // 08:00–18:00
                              const startMins = (startH - 8) * 60 + startM;
                              const durMins   = Math.max(30, (endH - startH) * 60 + (endM - startM));
                              const leftPct  = (startMins / totalMins) * 100;
                              const widthPct = (durMins  / totalMins) * 100;
                              const isPending = r.status === "pending";
                              return (
                                <div key={r.id} className="relative h-5">
                                  <div
                                    className={cn(
                                      "absolute top-0 bottom-0 rounded flex items-center px-1.5",
                                      "text-[10px] font-medium overflow-hidden shadow-sm cursor-default",
                                      isPending
                                        ? "bg-muted-foreground/30 text-foreground border border-dashed border-muted-foreground/60"
                                        : cn("text-white", roomColorClass(r.room, false, allRooms))
                                    )}
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                    title={`${r.topic}\n${resolveRoom(r.room)} | ${r.startTime}–${r.endTime}\n${r.bookerName}${
                                      isPending ? "\n[รออนุมัติ]" : ""
                                    }`}
                                  >
                                    <span className="truncate">
                                      {isPending && "⧖ "}{resolveRoom(r.room)} · {r.startTime}–{r.endTime}
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

      {/* Daily Bookings Card */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            รายการจองประจำวัน
          </CardTitle>
          <CardDescription>
            {formatDateThaiFullBE(selectedDay)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SelectedDayHolidayPanel holidays={selectedDayHolidays} />
          {selectedDayBookings.length === 0 && selectedDayHolidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ไม่มีการจองในวันนี้</p>
          ) : selectedDayBookings.length === 0 ? null : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{selectedDayBookings.length} รายการ</p>
              {selectedDayBookings.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "rounded-lg border p-3 space-y-1.5",
                    r.status === "pending"
                      ? "border-dashed border-muted-foreground/50 bg-muted/30"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          r.status === "pending"
                            ? ""
                            : roomColorClass(r.room, true, allRooms)
                        )}
                      >
                        {resolveRoom(r.room)}
                      </Badge>
                      {r.status === "pending" && (
                        <Badge variant="secondary" className="text-[10px]">รออนุมัติ</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {r.startTime}–{r.endTime} น.
                    </div>
                  </div>
                  <p className="text-sm font-medium leading-snug">{r.topic}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {r.department}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {r.bookerName}
                    </div>
                  </div>
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
