import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil, Trash2, CalendarIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, resolveRoom, roomColorClass, roomMatchesFilter } from "@/lib/mockData";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, doc, deleteDoc, updateDoc,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STATUS_LABEL: Record<string, { text: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending:  { text: "รออนุมัติ",  variant: "secondary" },
  approved: { text: "อนุมัติแล้ว", variant: "default"   },
};

export default function ManageReservations() {
  const { toast } = useToast();
  const { activeRooms, allRooms } = useMeetingRooms();

  // ---- State ----
  const [reservations, setReservations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // ---- Firestore real-time ----
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "reservations"),
      (snap) => setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.error(err);
        toast({ title: "โหลดข้อมูลไม่สำเร็จ", variant: "destructive" });
      }
    );
    return () => unsub();
  }, []);

  // ---- Filtered list ----
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reservations.filter((r) => {
      const matchSearch =
        !q ||
        r.topic?.toLowerCase().includes(q) ||
        r.bookerName?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.room?.toLowerCase().includes(q);
      const matchRoom   = roomMatchesFilter(r.room ?? "", filterRoom, allRooms);
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      return matchSearch && matchRoom && matchStatus;
    });
  }, [reservations, search, filterRoom, filterStatus]);

  // ---- Sorted list: current/future first, past last ----
  const sortedFiltered = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return filtered.slice().sort((a, b) => {
      const aDate = a.date ?? "";
      const bDate = b.date ?? "";
      const aIsPast = aDate < todayStr;
      const bIsPast = bDate < todayStr;
      // Past items go to the end
      if (aIsPast && !bIsPast) return 1;
      if (!aIsPast && bIsPast) return -1;
      // Both same category: sort by date ascending
      return aDate.localeCompare(bDate);
    });
  }, [filtered]);

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE));
  const paginatedData = sortedFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRoom, filterStatus]);

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "reservations", deleteTarget.id));
      toast({ title: "ลบรายการแล้ว", description: `ยกเลิกการจอง "${deleteTarget.topic}" เรียบร้อย` });
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "ลบไม่สำเร็จ กรุณาลองใหม่", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // ---- Open edit dialog ----
  const openEdit = (r: any) => {
    setEditTarget(r);
    setEditRoom(r.room ?? "");
    setEditDate(r.date ? new Date(r.date) : undefined);
    setEditStart(r.startTime ?? "");
    setEditEnd(r.endTime ?? "");
  };

  // ---- Save edit ----
  const handleSaveEdit = async () => {
    if (!editTarget || !editRoom || !editDate || !editStart || !editEnd) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" });
      return;
    }

    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    if (toMin(editEnd) <= toMin(editStart)) {
      toast({ title: "เวลาไม่ถูกต้อง", description: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น", variant: "destructive" });
      return;
    }

    // ตรวจสอบ overlap (ยกเว้นรายการที่กำลังแก้ไขอยู่)
    const newDateStr = format(editDate, "yyyy-MM-dd");
    const ns = toMin(editStart);
    const ne = toMin(editEnd);
    const conflict = reservations.find((r) => {
      if (r.id === editTarget.id) return false;
      if (resolveRoom(r.room) !== resolveRoom(editRoom) || r.date !== newDateStr) return false;
      if (r.status === "rejected") return false;
      const rs = toMin(r.startTime); const re = toMin(r.endTime);
      return ns < re && ne > rs;
    });
    if (conflict) {
      toast({
        title: "ห้องประชุมถูกจองแล้วในช่วงเวลานี้",
        description: `${editRoom} ถูกจองเวลา ${conflict.startTime}–${conflict.endTime} อยู่แล้ว`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, "reservations", editTarget.id), {
        room:      editRoom,
        date:      newDateStr,
        startTime: editStart,
        endTime:   editEnd,
      });
      toast({ title: "อัปเดตแล้ว", description: "แก้ไขรายการจองเรียบร้อย" });
      setEditTarget(null);
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "บันทึกไม่สำเร็จ กรุณาลองใหม่", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ---- UI ----
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">จัดการรายการจองทั้งหมด</CardTitle>
          <CardDescription>
            แสดงรายการทั้งหมด {reservations.length} รายการ · กรอง {filtered.length} รายการ · หน้า {currentPage}/{totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="ค้นหา เรื่อง / ผู้จอง / หน่วยงาน / ห้อง..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="กรองตามห้อง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกห้องประชุม</SelectItem>
                {allRooms.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รออนุมัติ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัน/เวลา</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>เรื่อง</TableHead>
                  <TableHead>หน่วยงาน</TableHead>
                  <TableHead>ผู้จอง</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                      ไม่พบรายการ
                    </TableCell>
                  </TableRow>
                )}
                {paginatedData.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        <div className={cn("font-medium", r.date && r.date < format(new Date(), "yyyy-MM-dd") && "text-muted-foreground")}>
                          {r.date
                            ? `${format(new Date(r.date), "d MMM", { locale: th })} ${new Date(r.date).getFullYear() + 543}`
                            : "-"}
                          {r.date && r.date < format(new Date(), "yyyy-MM-dd") && (
                            <span className="ml-1 text-[10px] text-muted-foreground">(ผ่านแล้ว)</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">{r.startTime}–{r.endTime} น.</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", roomColorClass(r.room, true, allRooms))}
                        >
                          {resolveRoom(r.room)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{r.topic}</TableCell>
                      <TableCell className="text-xs">{r.department}</TableCell>
                      <TableCell className="text-xs">{r.bookerName}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_LABEL[r.status]?.variant ?? "outline"} className="text-xs">
                          {STATUS_LABEL[r.status]?.text ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            title="แก้ไข (ย้ายห้อง / เปลี่ยนเวลา)"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            title="ลบ / ยกเลิกการจอง"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Delete Confirm Dialog ===== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการจอง</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบการจอง{" "}
              <span className="font-semibold text-foreground">"{deleteTarget?.topic}"</span>{" "}
              ห้อง <span className="font-semibold text-foreground">{deleteTarget?.room}</span>{" "}
              วันที่{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.date
                  ? `${format(new Date(deleteTarget.date), "d MMMM", { locale: th })} ${new Date(deleteTarget.date).getFullYear() + 543}`
                  : ""}
              </span>{" "}
              ใช่หรือไม่? <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Edit Dialog ===== */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขรายการจอง</DialogTitle>
            <DialogDescription>
              แก้ไขห้องประชุม วันที่ หรือเวลาของการจอง
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Topic (read-only) */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">เรื่อง</Label>
              <p className="text-sm font-medium">{editTarget?.topic}</p>
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label>ห้องประชุม</Label>
              <Select value={editRoom} onValueChange={setEditRoom}>
                <SelectTrigger><SelectValue placeholder="เลือกห้องประชุม" /></SelectTrigger>
                <SelectContent>
                  {allRooms.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>วันที่ประชุม</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate
                      ? `${format(editDate, "d MMMM", { locale: th })} ${editDate.getFullYear() + 543}`
                      : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={setEditDate}
                    locale={th}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>เวลาเริ่ม</Label>
                <Select value={editStart} onValueChange={setEditStart}>
                  <SelectTrigger><SelectValue placeholder="เลือกเวลา" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>{t} น.</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>เวลาสิ้นสุด</Label>
                <Select value={editEnd} onValueChange={setEditEnd}>
                  <SelectTrigger><SelectValue placeholder="เลือกเวลา" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>{t} น.</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>ยกเลิก</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
