import { useEffect, useMemo, useState } from "react";
import { Printer, FileSpreadsheet } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resolveRoom, roomColorClass, roomMatchesFilter } from "@/lib/mockData";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { openReservationTablePrint } from "@/lib/reservationPrintTable";
import { generateReservationPDF } from "@/lib/pdfGenerator";
import { ensureOfficialDocMeta } from "@/lib/officialPrintNumber";
import { cn } from "@/lib/utils";
import { buddhistYearSelectLabel, formatDateThaiBE } from "@/lib/thaiDate";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  approved: { label: "อนุมัติแล้ว", variant: "default" },
  pending: { label: "รออนุมัติ", variant: "secondary" },
};

export default function AdminPrintDocuments() {
  const { toast } = useToast();
  const { activeRooms, allRooms } = useMeetingRooms();
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending">("approved");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), (snap) => {
      setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  const filteredRows = useMemo(() => {
    return reservations
      .filter((r) => {
        if (!r.date) return false;
        if (r.status === "rejected") return false;
        const d = new Date(r.date);
        if (d.getFullYear() !== selectedYear || d.getMonth() !== selectedMonth) return false;
        if (!roomMatchesFilter(r.room ?? "", filterRoom, allRooms)) return false;
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const dc = String(a.date).localeCompare(String(b.date));
        if (dc !== 0) return dc;
        return String(a.startTime ?? "").localeCompare(String(b.startTime ?? ""));
      });
  }, [reservations, selectedYear, selectedMonth, filterRoom, filterStatus, allRooms]);

  const subtitle = `เดือน${THAI_MONTHS[selectedMonth]} ${selectedYear + 543}${
    filterRoom !== "all" ? ` · ห้อง ${filterRoom}` : ""
  }${filterStatus !== "all" ? ` · ${STATUS_MAP[filterStatus]?.label ?? filterStatus}` : ""}`;

  const handlePrint = () => {
    openReservationTablePrint(filteredRows, {
      title: "รายการจองห้องประชุม",
      subtitle,
      rooms: allRooms,
    });
  };

  const handlePrintForm = async (row: Record<string, unknown> & { id: string; status?: string }) => {
    if (row.status !== "approved") return;
    try {
      const meta = await ensureOfficialDocMeta({
        id: row.id,
        status: row.status,
        officialDocNumber: row.officialDocNumber as string | undefined,
        approvedAt: row.approvedAt,
      });
      await generateReservationPDF(
        {
          ...row,
          officialDocNumber: meta.officialDocNumber,
          approvedAt: meta.approvedAt.toISOString(),
        },
        allRooms,
        "official",
      );
    } catch (e) {
      console.error(e);
      toast({
        title: "พิมพ์แบบฟอร์มไม่สำเร็จ",
        description: "ไม่สามารถออกเลขที่เอกสารหรือเปิดแบบฟอร์มได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 w-full max-w-none -mx-1 sm:-mx-2 md:-mx-3">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              พิมพ์เอกสาร
            </CardTitle>
            <CardDescription>
              แสดงรายการจองเป็นตาราง — ใช้ปุ่มพิมพ์เพื่อส่งออกเอกสาร (A4 แนวนอน)
            </CardDescription>
          </div>
          <Button onClick={handlePrint} className="gap-2 shrink-0" disabled={filteredRows.length === 0}>
            <Printer className="h-4 w-4" />
            พิมพ์ตาราง ({filteredRows.length} รายการ)
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ปี</p>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {buddhistYearSelectLabel(y)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">เดือน</p>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THAI_MONTHS.map((name, idx) => (
                    <SelectItem key={name} value={String(idx)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ห้องประชุม</p>
              <Select value={filterRoom} onValueChange={setFilterRoom}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="ทุกห้อง" />
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
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">สถานะ</p>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                  <SelectItem value="pending">รออนุมัติ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto w-full">
            <Table className="w-full min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">ลำดับ</TableHead>
                  <TableHead className="w-24">ติดตาม</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="whitespace-nowrap">เวลา</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead className="min-w-[150px]">เรื่อง</TableHead>
                  <TableHead className="min-w-[100px]">หน่วยงาน</TableHead>
                  <TableHead>ผู้จอง</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="w-14 text-center">พิมพ์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      ไม่มีรายการตามเงื่อนไขที่เลือก
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{r.trackingNumber ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.date ? formatDateThaiBE(r.date) : "-"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.startTime}–{r.endTime}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", roomColorClass(r.room, true, allRooms))}
                        >
                          {resolveRoom(r.room)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm align-top">{r.topic}</TableCell>
                      <TableCell className="text-sm align-top">{r.department}</TableCell>
                      <TableCell className="text-sm">{r.bookerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={STATUS_MAP[r.status]?.variant ?? "outline"} className="text-xs">
                          {STATUS_MAP[r.status]?.label ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.status === "approved" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            title="พิมพ์แบบฟอร์มจองห้องประชุม (A4)"
                            aria-label="พิมพ์แบบฟอร์มจองห้องประชุม"
                            onClick={() => handlePrintForm(r)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            แสดง {filteredRows.length} รายการ · ไอคอนพิมพ์ (อนุมัติแล้ว) ใส่เลขที่เอกสารและวันเวลาอนุมัติ · ผู้จองทั่วไปได้แบบฟอร์ม 2 ฝั่งแต่ไม่มีเลขที่
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
