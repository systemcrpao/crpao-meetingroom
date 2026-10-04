import { useEffect, useMemo, useState } from "react";
import { FileDown, MessageSquareQuote, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { buddhistYearSelectLabel } from "@/lib/thaiDate";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  DIMENSION_TITLES,
  SURVEY_SECTIONS,
  type BookingFeedbackRow,
  type DimensionKey,
  computeSatisfactionSummary,
  filterFeedbackByPeriod,
  formatAvgScore,
  satisfactionLevelLabel,
} from "@/lib/bookingFeedback";
import { openSatisfactionReportPdf } from "@/lib/satisfactionReportPdf";

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

export default function AdminSatisfactionReport() {
  const [rows, setRows] = useState<BookingFeedbackRow[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookingFeedback"), (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookingFeedbackRow));
    });
    return () => unsub();
  }, []);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);
  const beYear = selectedYear + 543;

  const filtered = useMemo(
    () => filterFeedbackByPeriod(rows, viewMode, selectedYear, selectedMonth),
    [rows, viewMode, selectedYear, selectedMonth],
  );

  const summary = useMemo(() => computeSatisfactionSummary(filtered), [filtered]);

  const periodTitle =
    viewMode === "month"
      ? `ประจำเดือน${THAI_MONTHS[selectedMonth]} พ.ศ. ${beYear}`
      : `ประจำปี พ.ศ. ${beYear}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">คะแนนและสถิติ</h2>
          <p className="text-sm text-muted-foreground mt-0.5">สรุปคะแนนเฉลี่ยและการกระจายคะแนนรายข้อ</p>
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
          <Button size="sm" className="h-8 gap-1.5" onClick={() => openSatisfactionReportPdf(periodTitle, summary)}>
            <FileDown className="h-3.5 w-3.5" />
            ส่งออก PDF
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium text-primary">{periodTitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> จำนวนการตอบ
            </CardDescription>
            <CardTitle className="text-3xl">{summary.totalResponses}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            มีคะแนน {summary.scoredResponses} รายการ
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" /> คะแนนเฉลี่ยรวม (ทุกข้อ)
            </CardDescription>
            <CardTitle className="text-3xl">{formatAvgScore(summary.overallAverage)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {satisfactionLevelLabel(summary.overallAverage)} · จาก 5.00
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MessageSquareQuote className="h-3.5 w-3.5" /> ข้อเสนอแนะ
            </CardDescription>
            <CardTitle className="text-3xl">{summary.suggestions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">รายการที่มีข้อความ</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(DIMENSION_TITLES) as DimensionKey[]).map((dim) => (
          <Card key={dim}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium leading-snug">{DIMENSION_TITLES[dim]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatAvgScore(summary.dimensionAverages[dim])}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {satisfactionLevelLabel(summary.dimensionAverages[dim])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">คะแนนเฉลี่ยรายข้อ</CardTitle>
          <CardDescription>มาตรวัด 1 = น้อยที่สุด · 5 = มากที่สุด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">ด้าน</TableHead>
                <TableHead className="w-12 text-center">ข้อ</TableHead>
                <TableHead>รายการประเมิน</TableHead>
                <TableHead className="text-center w-24">เฉลี่ย</TableHead>
                <TableHead className="text-center w-28">ระดับ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SURVEY_SECTIONS.flatMap((section) =>
                section.items.map((item) => {
                  const avg = summary.averages[item.key];
                  return (
                    <TableRow key={item.key}>
                      <TableCell className="text-xs text-muted-foreground">{section.title}</TableCell>
                      <TableCell className="text-center text-xs font-semibold tabular-nums">{item.code}</TableCell>
                      <TableCell className="text-sm">{item.label}</TableCell>
                      <TableCell className="text-center font-semibold">{formatAvgScore(avg)}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {satisfactionLevelLabel(avg)}
                      </TableCell>
                    </TableRow>
                  );
                }),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {SURVEY_SECTIONS.flatMap((section) =>
          section.items.map((item) => (
            <Card key={item.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{section.title}</CardTitle>
                <CardDescription className="text-sm font-medium text-foreground leading-snug">
                  <span className="font-semibold tabular-nums">{item.code}</span> {item.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {([5, 4, 3, 2, 1] as const).map((n) => {
                  const count = summary.distributions[item.key][n];
                  const max = Math.max(1, ...Object.values(summary.distributions[item.key]));
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-4 font-semibold">{n}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-primary/80")}
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )),
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ข้อเสนอแนะล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีข้อเสนอแนะในช่วงเวลานี้</p>
          ) : (
            <ul className="space-y-3">
              {summary.suggestions.slice(0, 20).map((s, i) => (
                <li key={`${s.trackingNumber}-${i}`} className="text-sm border rounded-md p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-1">
                    หมายเลข {s.trackingNumber} · {s.at}
                  </p>
                  <p>{s.text}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
