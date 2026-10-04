import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  ANNOUNCEMENTS_COLLECTION,
  sortAnnouncementsNewestFirst,
  type Announcement,
} from "@/lib/announcements";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatWhen(row: Announcement): string {
  const ts = row.updatedAt ?? row.createdAt;
  const d =
    ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function"
      ? ts.toDate()
      : null;
  if (!d) return "—";
  return format(d, "d MMM yyyy HH:mm", { locale: th });
}

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishActive, setPublishActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, ANNOUNCEMENTS_COLLECTION), (snap) => {
      const list = sortAnnouncementsNewestFirst(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement),
      );
      setRows(list);
    });
    return () => unsub();
  }, []);

  const authorName = useMemo(() => {
    if (user?.displayName?.trim()) return user.displayName.trim();
    if (user?.email) return user.email.split("@")[0];
    return "Super Admin";
  }, [user]);

  const handleCreate = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      toast({ title: "กรุณากรอกหัวข้อและเนื้อหา", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      if (publishActive) {
        await deactivateAllAnnouncements();
      }
      await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
        title: t,
        content: c,
        isActive: publishActive,
        authorEmail: user?.email ?? "",
        authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle("");
      setContent("");
      setPublishActive(true);
      toast({ title: "บันทึกประกาศแล้ว" });
    } catch (e) {
      console.error(e);
      const hint =
        e instanceof Error && /permission/i.test(e.message)
          ? " — ลองออกจากระบบแล้วเข้าใหม่ หรือ deploy firestore.rules ล่าสุด"
          : "";
      toast({ title: `บันทึกไม่สำเร็จ${hint}`, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  async function deactivateAllAnnouncements(exceptId?: string) {
    const snap = await getDocs(collection(db, ANNOUNCEMENTS_COLLECTION));
    const batch = writeBatch(db);
    let n = 0;
    for (const d of snap.docs) {
      if (exceptId && d.id === exceptId) continue;
      const data = d.data();
      if (data.isActive) {
        batch.update(d.ref, { isActive: false, updatedAt: serverTimestamp() });
        n++;
      }
    }
    if (n > 0) await batch.commit();
  }

  const handleToggleActive = async (row: Announcement, next: boolean) => {
    try {
      if (next) {
        await deactivateAllAnnouncements(row.id);
      }
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, row.id), {
        isActive: next,
        updatedAt: serverTimestamp(),
      });
      toast({ title: next ? "เปิดแสดงประกาศแล้ว" : "ปิดการแสดงประกาศแล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "ดำเนินการไม่สำเร็จ", variant: "destructive" });
    }
  };

  const openEdit = (row: Announcement) => {
    setEditTarget(row);
    setEditTitle(row.title ?? "");
    setEditContent(row.content ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const t = editTitle.trim();
    const c = editContent.trim();
    if (!t || !c) {
      toast({ title: "กรุณากรอกหัวข้อและเนื้อหา", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, editTarget.id), {
        title: t,
        content: c,
        updatedAt: serverTimestamp(),
      });
      setEditTarget(null);
      toast({ title: "แก้ไขประกาศแล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "แก้ไขไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (row: Announcement) => {
    if (!confirm(`ลบประกาศ "${row.title}" ?`)) return;
    try {
      await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, row.id));
      toast({ title: "ลบประกาศแล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-primary" />
          ประกาศ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Super Admin สร้างประกาศแสดงบนหน้าจอง — เปิดได้ครั้งละ 1 รายการ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">สร้างประกาศใหม่</CardTitle>
          <CardDescription>กรอกหัวข้อและเนื้อหา แล้วบันทึก</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">หัวข้อ</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้อประกาศ"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-content">เนื้อหา</Label>
            <Textarea
              id="ann-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="รายละเอียดประกาศ"
              className="min-h-[120px] resize-y"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">เปิดแสดงทันที</p>
              <p className="text-xs text-muted-foreground">จะปิดประกาศอื่นที่เปิดอยู่โดยอัตโนมัติ</p>
            </div>
            <Switch checked={publishActive} onCheckedChange={setPublishActive} />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            <Plus className="h-4 w-4" />
            {creating ? "กำลังบันทึก..." : "บันทึกประกาศ"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">รายการประกาศ</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีประกาศ</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หัวข้อ</TableHead>
                  <TableHead>ผู้ประกาศ</TableHead>
                  <TableHead>อัปเดต</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-sm max-w-[240px]">
                      <span className="line-clamp-2">{row.title}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.authorName || row.authorEmail || "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatWhen(row)}</TableCell>
                    <TableCell className="text-center">
                      {row.isActive ? (
                        <Badge className="bg-green-600 hover:bg-green-600">เปิด</Badge>
                      ) : (
                        <Badge variant="secondary">ปิด</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={!!row.isActive}
                            onCheckedChange={(v) => handleToggleActive(row, v)}
                            aria-label="เปิดปิดประกาศ"
                          />
                        </div>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          แก้ไข
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-destructive"
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          ลบ
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขประกาศ</DialogTitle>
            <DialogDescription>แก้ไขหัวข้อและเนื้อหาประกาศ</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>หัวข้อ</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>เนื้อหา</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[140px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
