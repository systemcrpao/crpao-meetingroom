import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { INITIAL_RESERVATIONS, ROOMS, ROOM_COLORS, ROOM_COLORS_LIGHT, type Reservation } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8-18

export default function AdminDashboard() {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [roomFilter, setRoomFilter] = useState("all");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const pendingReservations = reservations.filter((r) => r.status === "pending");
  const approvedReservations = reservations.filter((r) => r.status === "approved");

  const handleApprove = (id: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    toast({ title: "อนุมัติแล้ว", description: "รายการจองได้รับการอนุมัติเรียบร้อย" });
  };

  const handleReject = (id: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
    toast({ title: "ปฏิเสธแล้ว", description: "รายการจองถูกปฏิเสธ", variant: "destructive" });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredApproved = useMemo(() => {
    if (roomFilter === "all") return approvedReservations;
    return approvedReservations.filter((r) => r.room === roomFilter);
  }, [approvedReservations, roomFilter]);

  const getBookingsForDay = (day: Date) =>
    filteredApproved.filter((r) => isSameDay(new Date(r.date), day));

  const getBlockStyle = (r: Reservation) => {
    const startH = parseInt(r.startTime.split(":")[0]);
    const startM = parseInt(r.startTime.split(":")[1]);
    const endH = parseInt(r.endTime.split(":")[0]);
    const endM = parseInt(r.endTime.split(":")[1]);
    const top = ((startH - 8) + startM / 60) * 4; // 4rem per hour
    const height = ((endH - startH) + (endM - startM) / 60) * 4;
    return { top: `${top}rem`, height: `${height}rem` };
  };

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">รายการรออนุมัติ</CardTitle>
          <CardDescription>
            {pendingReservations.length} รายการที่รอดำเนินการ
          </CardDescription>
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
                  {pendingReservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">{r.department}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{r.topic}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", ROOM_COLORS_LIGHT[r.room])}>
                          {r.room}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.date), "d MMM yy", { locale: th })}
                        <br />
                        {r.startTime}-{r.endTime}
                      </TableCell>
                      <TableCell className="text-xs">{r.bookerName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">รออนุมัติ</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-[hsl(var(--room-green))]" onClick={() => handleApprove(r.id)}>
                            <Check className="h-3 w-3 mr-1" /> อนุมัติ
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleReject(r.id)}>
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
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">ตารางการจอง</CardTitle>
              <CardDescription>ภาพรวมการจองห้องประชุมรายสัปดาห์</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={roomFilter} onValueChange={setRoomFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="กรองตามห้อง" />
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

          {/* Room legend */}
          <div className="flex flex-wrap gap-2 pt-2">
            {ROOMS.map((r) => (
              <div key={r.value} className="flex items-center gap-1.5">
                <div className={cn("h-3 w-3 rounded-sm", ROOM_COLORS[r.value])} />
                <span className="text-xs text-muted-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> สัปดาห์ก่อน
            </Button>
            <span className="text-sm font-medium">
              {format(weekDays[0], "d MMM", { locale: th })} — {format(weekDays[6], "d MMM yyyy", { locale: th })}
            </span>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              สัปดาห์ถัดไป <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Timeline grid */}
          <div className="overflow-x-auto">
            <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              {/* Header row */}
              <div className="border-b border-r p-2" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-b p-2 text-center text-xs font-medium",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <div>{format(day, "EEE", { locale: th })}</div>
                  <div className={cn(
                    "text-lg font-bold",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}

              {/* Time column + day columns */}
              <div className="border-r">
                {HOURS.map((h) => (
                  <div key={h} className="h-16 border-b px-2 flex items-start pt-1">
                    <span className="text-xs text-muted-foreground">{h.toString().padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day) => {
                const bookings = getBookingsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn("relative", isSameDay(day, new Date()) && "bg-primary/5")}
                  >
                    {HOURS.map((h) => (
                      <div key={h} className="h-16 border-b border-r" />
                    ))}
                    {bookings.map((r) => {
                      const style = getBlockStyle(r);
                      return (
                        <div
                          key={r.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-white text-[10px] leading-tight overflow-hidden cursor-default shadow-sm",
                            ROOM_COLORS[r.room]
                          )}
                          style={style}
                          title={`${r.topic}\n${r.room} | ${r.startTime}-${r.endTime}\n${r.bookerName}`}
                        >
                          <div className="font-semibold truncate">{r.room}</div>
                          <div className="truncate opacity-90">{r.topic}</div>
                          <div className="opacity-75">{r.startTime}-{r.endTime}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
