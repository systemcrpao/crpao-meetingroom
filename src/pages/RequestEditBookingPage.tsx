import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, ArrowLeft, Save, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, roomColorClass, getRoomLabel } from "@/lib/mockData";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { formatDateThaiLongBE } from "@/lib/thaiDate";
import {
  fetchReservationsByTracking,
  hasPendingChangeRequest,
  submitCancelChangeRequest,
  submitEditChangeRequest,
} from "@/lib/reservationChangeRequest";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RowEdit = {
  id: string;
  room: string;
  date: Date;
  startTime: string;
  endTime: string;
  originalDate: string;
  originalStart: string;
  originalEnd: string;
};

export default function RequestEditBookingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { allRooms } = useMeetingRooms();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [meta, setMeta] = useState<any | null>(null);
  const [rows, setRows] = useState<RowEdit[]>([]);
  const [loadError, setLoadError] = useState("");

  const trackingCode = (code ?? "").trim().toUpperCase();

  useEffect(() => {
    if (!trackingCode) {
      setLoadError("ไม่พบหมายเลขติดตาม");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const list = await fetchReservationsByTracking(trackingCode);
        if (cancelled) return;
        if (list.length === 0) {
          setLoadError("ไม่พบรายการจอง");
          setMeta(null);
          setRows([]);
          return;
        }

        const first = list[0];
        if (first.status !== "approved") {
          setLoadError("แก้ไขได้เฉพาะรายการที่อนุมัติแล้ว");
          setMeta(first);
          setRows([]);
          return;
        }
        if (list.some((r) => hasPendingChangeRequest(r))) {
          setLoadError("มีคำขอแก้ไข/ยกเลิกที่รออนุมัติอยู่แล้ว");
          setMeta(first);
          setRows([]);
          return;
        }

        setMeta(first);
        setRows(
          list.map((r) => {
            const dateStr = String(r.date ?? "");
            return {
              id: r.id,
              room: String(r.room ?? ""),
              date: dateStr ? parseISO(dateStr) : new Date(),
              startTime: String(r.startTime ?? ""),
              endTime: String(r.endTime ?? ""),
              originalDate: dateStr,
              originalStart: String(r.startTime ?? ""),
              originalEnd: String(r.endTime ?? ""),
            };
          }),
        );
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trackingCode]);

  const endOptionsFor = (startTime: string) => {
    if (!startTime) return TIME_SLOTS;
    return TIME_SLOTS.filter((t) => t > startTime);
  };

  const updateRow = (id: string, patch: Partial<Pick<RowEdit, "date" | "startTime" | "endTime">>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.startTime && next.endTime <= patch.startTime) {
          const opts = TIME_SLOTS.filter((t) => t > patch.startTime!);
          next.endTime = opts[0] ?? next.endTime;
        }
        return next;
      }),
    );
  };

  const changedRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          format(r.date, "yyyy-MM-dd") !== r.originalDate ||
          r.startTime !== r.originalStart ||
          r.endTime !== r.originalEnd,
      ),
    [rows],
  );

  const handleSave = async () => {
    if (changedRows.length === 0) {
      toast({ title: "ไม่มีการเปลี่ยนแปลง", description: "กรุณาแก้ไขวันหรือเวลาก่อนบันทึก" });
      return;
    }
    setSaving(true);
    try {
      for (const row of changedRows) {
        await submitEditChangeRequest(row.id, row.room, {
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
        });
      }
      toast({
        title: "ส่งคำขอแก้ไขแล้ว",
        description: "รอเจ้าหน้าที่อนุมัติ ระบบจะอัปเดตปฏิทินเมื่ออนุมัติ",
      });
      navigate(`/tracking?code=${trackingCode}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      toast({ title: "ไม่สามารถบันทึกได้", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBooking = async () => {
    setCanceling(true);
    try {
      await submitCancelChangeRequest(trackingCode);
      toast({
        title: "ส่งคำขอยกเลิกแล้ว",
        description: "รอเจ้าหน้าที่อนุมัติ การจองจะถูกลบออกจากปฏิทินเมื่ออนุมัติ",
      });
      navigate(`/tracking?code=${trackingCode}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ";
      toast({ title: "ไม่สามารถส่งคำขอได้", description: msg, variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center pt-10 px-4 pb-12">
      <div className="w-full max-w-2xl space-y-4">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate("/tracking")}>
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าติดตาม
        </Button>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>ขอแก้ไขการจอง</CardTitle>
            <CardDescription>
              หมายเลขติดตาม{" "}
              <span className="font-mono font-semibold tracking-widest">{trackingCode || "—"}</span>
              {" · "}
              แก้ไขได้เฉพาะวันและเวลา ข้อมูลอื่นไม่สามารถเปลี่ยนได้
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && <p className="text-sm text-muted-foreground text-center py-8">กำลังโหลด...</p>}

            {!loading && loadError && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-destructive font-medium">{loadError}</p>
                {meta && (
                  <p className="text-xs text-muted-foreground">
                    {meta.topic} · {getRoomLabel(meta.room, allRooms)}
                  </p>
                )}
              </div>
            )}

            {!loading && !loadError && meta && (
              <>
                <div className="rounded-lg border bg-muted/30 p-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">เรื่อง</p>
                    <p className="font-medium">{meta.topic}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ห้องประชุม</p>
                    <Badge variant="outline" className={cn("text-xs mt-0.5", roomColorClass(meta.room, true, allRooms))}>
                      {getRoomLabel(meta.room, allRooms)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">หน่วยงาน</p>
                    <p className="font-medium text-xs">{meta.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ผู้จอง</p>
                    <p className="font-medium">{meta.bookerName}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  {rows.map((row, index) => (
                    <div key={row.id} className="space-y-3 rounded-lg border p-4">
                      {rows.length > 1 && (
                        <p className="text-xs font-semibold text-muted-foreground">วันที่จอง #{index + 1}</p>
                      )}
                      <div className="space-y-2">
                        <Label>วันที่ประชุม</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formatDateThaiLongBE(row.date)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={row.date}
                              onSelect={(d) => d && updateRow(row.id, { date: d })}
                              locale={th}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>เวลาเริ่ม</Label>
                          <Select value={row.startTime} onValueChange={(v) => updateRow(row.id, { startTime: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกเวลา" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t} น.
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>เวลาสิ้นสุด</Label>
                          <Select value={row.endTime} onValueChange={(v) => updateRow(row.id, { endTime: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกเวลา" />
                            </SelectTrigger>
                            <SelectContent>
                              {endOptionsFor(row.startTime).map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t} น.
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "กำลังส่งคำขอ..." : "บันทึกคำขอแก้ไข (รออนุมัติ)"}
                </Button>

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full gap-2" disabled={canceling}>
                      <Ban className="h-4 w-4" />
                      ขอยกเลิกการจอง
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันขอยกเลิกการจอง?</AlertDialogTitle>
                      <AlertDialogDescription>
                        คำขอจะส่งให้เจ้าหน้าที่อนุมัติ เมื่ออนุมัติแล้วรายการจะถูกลบออกจากปฏิทินทั้งหมด
                        {rows.length > 1 ? " (ทุกวันที่ของหมายเลขติดตามนี้)" : ""}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleCancelBooking}
                      >
                        {canceling ? "กำลังส่ง..." : "ยืนยันขอยกเลิก"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
