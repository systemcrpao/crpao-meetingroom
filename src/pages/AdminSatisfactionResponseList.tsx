import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarCheck, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { buddhistYearSelectLabel, formatDateThaiBE } from "@/lib/thaiDate";
import { resolveRoom } from "@/lib/mockData";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  BOOKING_FEEDBACK_COLLECTION,
  type BookingFeedbackRow,
  buildSurveyResponseListItems,
  filterReservationsByMeetingPeriod,
  indexFeedbackByTracking,
} from "@/lib/bookingFeedback";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const BOOKING_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  approved: { label: "อนุมัติแล้ว", variant: "default" },
  pending: { label: "รออนุมัติ", variant: "secondary" },
};

type SurveyFilter = "all" | "answered" | "not_answered";

export default function AdminSatisfactionResponseList() {
  const [feedbackRows, setFeedbackRows] = useState<BookingFeedbackRow[]>([]);
  const [reservations, setReservations] = useState<
    {
      id: string;
      trackingNumber?: string;
      date?: string;
      room?: string;
      topic?: string;
      department?: string;
      bookerName?: string;
      status?: string;
    }[]
  >([]);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [surveyFilter, setSurveyFilter] = useState<SurveyFilter>("all");

  useEffect(() => {
    const unsubFb = onSnapshot(collection(db, BOOKING_FEEDBACK_COLLECTION), (snap) => {
      setFeedbackRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookingFeedbackRow));
    });
    const unsubRes = onSnapshot(collection(db, "reservations"), (snap) => {
      setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubFb();
      unsubRes();
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);
  const beYear = selectedYear + 543;

  const feedbackByTracking = useMemo(() => indexFeedbackByTracking(feedbackRows), [feedbackRows]);

  const periodReservations = useMemo(
    () => filterReservationsByMeetingPeriod(reservations, viewMode, selectedYear, selectedMonth),
    [reservations, viewMode, selectedYear, selectedMonth],
  );

  const listItems = useMemo(
    () => buildSurveyResponseListItems(periodReservations, feedbackByTracking),
    [periodReservations, feedbackByTracking],
  );

  const counts = useMemo(() => {
    const answered = listItems.filter((i) => i.surveyStatus === "answered").length;
    return {
      total: listItems.length,
      answered,
      notAnswered: listItems.length - answered,
    };
  }, [listItems]);

  const filteredItems = useMemo(() => {
    if (surveyFilter === "all") return listItems;
    return listItems.filter((i) => i.surveyStatus === surveyFilter);
  }, [listItems, surveyFilter]);

  const periodTitle =
    viewMode === "month"
      ? `ประจำเดือน${THAI_MONTHS[selectedMonth]} พ.ศ. ${beYear}`
      : `ประจำปี พ.ศ. ${beYear}`;

  const responseRate =
    counts.total > 0 ? Math.round((counts.answered / counts.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">รายการตอบแบบประเมิน</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            เปรียบเทียบการจองกับการส่งแบบประเมินหลังจอง (ตามวันใช้ห้อง)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {buddhistYearSelectLabel(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {viewMode === "month" && (
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THAI_MONTHS.map((name, idx) => (
                  <SelectItem key={name} value={idx.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-primary">{periodTitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> การจองในงวด
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{counts.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            ไม่รวมรายการที่ถูกปฏิเสธ · อัตราตอบ {responseRate}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> ตอบแบบประเมินแล้ว
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums text-green-700 dark:text-green-400">
              {counts.answered}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">มีข้อมูลใน bookingFeedback</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <CircleDashed className="h-3.5 w-3.5" /> ยังไม่ตอบ
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-700 dark:text-amber-400">
              {counts.notAnswered}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">ข้ามหรือยังไม่ส่งแบบประเมิน</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">รายละเอียดรายการ</CardTitle>
            <CardDescription>เลขติดตาม · วันใช้ห้อง · สถานะการตอบแบบประเมิน</CardDescription>
          </div>
          <Select value={surveyFilter} onValueChange={(v) => setSurveyFilter(v as SurveyFilter)}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="กรองสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด ({counts.total})</SelectItem>
              <SelectItem value="answered">ตอบแล้ว ({counts.answered})</SelectItem>
              <SelectItem value="not_answered">ยังไม่ตอบ ({counts.notAnswered})</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">ลำดับ</TableHead>
                  <TableHead className="w-24">เลขติดตาม</TableHead>
                  <TableHead>วันใช้ห้อง</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead className="min-w-[140px]">เรื่อง</TableHead>
                  <TableHead>หน่วยงาน</TableHead>
                  <TableHead>ผู้จอง</TableHead>
                  <TableHead className="text-center">สถานะจอง</TableHead>
                  <TableHead className="text-center min-w-[120px]">แบบประเมิน</TableHead>
                  <TableHead>วันที่ตอบ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      ไม่มีรายการในช่วงเวลานี้
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((row, index) => {
                    const bookingMeta = BOOKING_STATUS[row.reservationStatus] ?? {
                      label: row.reservationStatus || "—",
                      variant: "outline" as const,
                    };
                    const answered = row.surveyStatus === "answered";
                    return (
                      <TableRow key={row.reservationId}>
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.trackingNumber}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {row.meetingDate ? formatDateThaiBE(row.meetingDate) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{resolveRoom(row.room)}</TableCell>
                        <TableCell className="text-sm align-top">{row.topic || "—"}</TableCell>
                        <TableCell className="text-sm align-top">{row.department || "—"}</TableCell>
                        <TableCell className="text-sm">{row.bookerName || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={bookingMeta.variant} className="text-xs">
                            {bookingMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={answered ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              answered && "bg-green-600 hover:bg-green-600",
                              !answered && "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100",
                            )}
                          >
                            {answered ? "ตอบแล้ว" : "ยังไม่ตอบ"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {row.answeredAt
                            ? format(row.answeredAt, "d MMM yyyy", { locale: th })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
