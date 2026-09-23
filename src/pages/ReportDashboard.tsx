import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, DoorOpen, CalendarCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { buddhistYearSelectLabel } from "@/lib/thaiDate";
import { resolveRoom } from "@/lib/mockData";
import { findMeetingRoom, roomSolidColorClass } from "@/lib/meetingRooms";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export default function ReportDashboard() {
  const { activeRooms, allRooms } = useMeetingRooms();
  const [reservations, setReservations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // 0-based

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReservations(data);
    });
    return () => unsub();
  }, []);

  const beYear = selectedYear + 543;

  // Generate year options (current - 2 to current + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  // Filter approved reservations
  const approvedReservations = reservations.filter((r) => r.status === "approved");

  // Stats per room
  const roomStats = useMemo(() => {
    return activeRooms.map((room) => {
      const filtered = approvedReservations.filter((r) => {
        if (!r.date || resolveRoom(r.room) !== room.value) return false;
        const d = new Date(r.date);
        if (viewMode === "month") {
          return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
        }
        return d.getFullYear() === selectedYear;
      });
      return {
        room: room.value,
        label: room.label,
        count: filtered.length,
      };
    });
  }, [approvedReservations, viewMode, selectedYear, selectedMonth, activeRooms]);

  const totalBookings = roomStats.reduce((sum, r) => sum + r.count, 0);
  const maxCount = Math.max(1, ...roomStats.map((r) => r.count));

  // Monthly breakdown for year view
  const monthlyBreakdown = useMemo(() => {
    if (viewMode !== "year") return [];
    return THAI_MONTHS.map((name, monthIdx) => {
      const count = approvedReservations.filter((r) => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      }).length;
      return { name, count };
    });
  }, [approvedReservations, viewMode, selectedYear]);

  const maxMonthly = Math.max(1, ...monthlyBreakdown.map((m) => m.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">รายงานการจองห้องประชุม</h1>
          <p className="text-sm text-muted-foreground">
            สรุปข้อมูลการใช้งานห้องประชุม
            {viewMode === "month"
              ? ` ประจำเดือน${THAI_MONTHS[selectedMonth]} ${beYear}`
              : ` ประจำปี ${beYear}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3 text-xs"
              onClick={() => setViewMode("month")}
            >
              รายเดือน
            </Button>
            <Button
              variant={viewMode === "year" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3 text-xs"
              onClick={() => setViewMode("year")}
            >
              รายปี
            </Button>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>{buddhistYearSelectLabel(y)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {viewMode === "month" && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear((y) => y - 1);
                  } else {
                    setSelectedMonth((m) => m - 1);
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-24 text-center">{THAI_MONTHS[selectedMonth]}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear((y) => y + 1);
                  } else {
                    setSelectedMonth((m) => m + 1);
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBookings}</p>
              <p className="text-xs text-muted-foreground">การจองทั้งหมด (อนุมัติแล้ว)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{roomStats.filter((r) => r.count > 0).length}</p>
              <p className="text-xs text-muted-foreground">ห้องที่มีการใช้งาน</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {roomStats.reduce((best, r) => (r.count > best.count ? r : best), roomStats[0])?.room || "-"}
              </p>
              <p className="text-xs text-muted-foreground">ห้องที่ใช้มากที่สุด</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Usage Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">สถิติการใช้งานแต่ละห้อง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomStats.map((stat) => (
              <div
                key={stat.room}
                className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-4 w-4 rounded-sm",
                      roomSolidColorClass(findMeetingRoom(stat.room, allRooms)?.colorKey ?? "slate"),
                    )}
                  />
                  <span className="text-sm font-semibold">{stat.room}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{stat.count}</span>
                  <span className="text-sm text-muted-foreground pb-0.5">ครั้ง</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      roomSolidColorClass(findMeetingRoom(stat.room, allRooms)?.colorKey ?? "slate"),
                    )}
                    style={{ width: `${(stat.count / maxCount) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown (Year View only) */}
      {viewMode === "year" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">สถิติรายเดือน ปี {beYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyBreakdown.map((m, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs w-20 text-right text-muted-foreground">{m.name}</span>
                  <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-primary/80 rounded-md transition-all duration-500 flex items-center"
                      style={{ width: `${Math.max(0, (m.count / maxMonthly) * 100)}%` }}
                    >
                      {m.count > 0 && (
                        <span className="text-[11px] font-medium text-white px-2">{m.count}</span>
                      )}
                    </div>
                    {m.count === 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">0</span>
                    )}
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{m.count} ครั้ง</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
