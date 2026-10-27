import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Download, FileSpreadsheet, History, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AUDIT_LOG_PREVIEW_LIMIT,
  clearAllAuditLogs,
  downloadAuditLogsBackup,
  downloadAuditLogsCsv,
  fetchAllAuditLogsForBackup,
  fetchAuditLogsPreview,
  type AuditLogDoc,
} from "@/lib/auditLog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatLogWhen(row: AuditLogDoc): string {
  const ts = row.createdAt;
  const d =
    ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function"
      ? ts.toDate()
      : null;
  if (!d) return "—";
  return format(d, "d MMM yyyy HH:mm:ss", { locale: th });
}

export default function AdminAuditLog() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAuditLogsPreview(AUDIT_LOG_PREVIEW_LIMIT);
      setRows(list);
    } catch (e) {
      console.error(e);
      toast({
        title: "โหลดบันทึกไม่สำเร็จ",
        description: "ตรวจสอบสิทธิ์ Firestore หรือ index ของ auditLogs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const all = await fetchAllAuditLogsForBackup();
      downloadAuditLogsBackup(all);
      toast({
        title: "สำรองบันทึกแล้ว",
        description: `ดาวน์โหลด JSON ${all.length} รายการ`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "สำรองไม่สำเร็จ", variant: "destructive" });
    } finally {
      setBackingUp(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const all = await fetchAllAuditLogsForBackup();
      downloadAuditLogsCsv(all);
      toast({
        title: "บันทึก CSV แล้ว",
        description: `ดาวน์โหลด ${all.length} รายการ (เปิดใน Excel ได้)`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "บันทึก CSV ไม่สำเร็จ", variant: "destructive" });
    } finally {
      setExportingCsv(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const n = await clearAllAuditLogs();
      setClearOpen(false);
      await load();
      toast({
        title: "ล้างบันทึกแล้ว",
        description: `ลบ ${n} รายการ`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "ล้างบันทึกไม่สำเร็จ", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            บันทึกกิจกรรม (Audit Log)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            แสดง {AUDIT_LOG_PREVIEW_LIMIT} รายการล่าสุด — การอนุมัติ แก้ไข ลบการจองโดยผู้ดูแล
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            โหลดใหม่
          </Button>
          <Button variant="outline" size="sm" onClick={handleBackup} disabled={backingUp}>
            <Download className="h-4 w-4 mr-1" />
            {backingUp ? "กำลังสำรอง…" : "Backup JSON"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exportingCsv}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            {exportingCsv ? "กำลังบันทึก…" : "บันทึก CSV"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setClearOpen(true)} disabled={clearing}>
            <Trash2 className="h-4 w-4 mr-1" />
            เคลียร์
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">รายการล่าสุด</CardTitle>
          <CardDescription>
            {loading ? "กำลังโหลด…" : `${rows.length} รายการ (สูงสุด ${AUDIT_LOG_PREVIEW_LIMIT} รายการ)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-10">กำลังโหลด…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">ยังไม่มีบันทึกกิจกรรม</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">วันที่</TableHead>
                    <TableHead>ผู้ทำ</TableHead>
                    <TableHead>การกระทำ</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead className="min-w-[140px]">รายละเอียด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatLogWhen(row)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{row.actorName || row.actorEmail}</div>
                        {row.actorName && (
                          <div className="text-muted-foreground truncate max-w-[160px]">{row.actorEmail}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{row.actionLabel || row.action}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.targetId}
                        {row.trackingNumber ? (
                          <div className="text-muted-foreground font-sans">#{row.trackingNumber}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.summary || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ล้างบันทึกทั้งหมด?</AlertDialogTitle>
            <AlertDialogDescription>
              จะลบเอกสารใน collection auditLogs ทั้งหมดจาก Firestore แนะนำกด Backup ก่อน
              การล้างไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault();
                void handleClear();
              }}
            >
              {clearing ? "กำลังล้าง…" : "ล้างทั้งหมด"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
