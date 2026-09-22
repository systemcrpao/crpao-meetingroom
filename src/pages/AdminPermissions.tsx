import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Shield, Save, Trash2, UserPlus } from "lucide-react";
import { db } from "@/lib/firebase";
import { ROOMS } from "@/lib/mockData";
import {
  adminDocId,
  type AdminUserDoc,
  type AdminRole,
} from "@/lib/adminAccess";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type AdminRow = AdminUserDoc & { id: string };

export default function AdminPermissions() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRooms, setNewRooms] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "adminUsers"), (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as AdminUserDoc) }))
        .filter((r) => r.role === "admin");
      rows.sort((a, b) => a.email.localeCompare(b.email, "th"));
      setAdmins(rows);
    });
    return () => unsub();
  }, []);

  const toggleNewRoom = (value: string) => {
    setNewRooms((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const toggleAdminRoom = (adminId: string, value: string) => {
    setAdmins((prev) =>
      prev.map((a) => {
        if (a.id !== adminId) return a;
        const allowed = a.allowedRooms.includes(value)
          ? a.allowedRooms.filter((v) => v !== value)
          : [...a.allowedRooms, value];
        return { ...a, allowedRooms: allowed };
      }),
    );
  };

  const handleAddAdmin = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "กรุณากรอกอีเมลให้ถูกต้อง", variant: "destructive" });
      return;
    }
    if (newRooms.length === 0) {
      toast({
        title: "เลือกห้องประชุมอย่างน้อย 1 ห้อง",
        description: "Super Admin ต้องกำหนดห้องที่ Admin สามารถอนุมัติได้",
        variant: "destructive",
      });
      return;
    }
    const id = adminDocId(email);
    try {
      await setDoc(doc(db, "adminUsers", id), {
        email,
        role: "admin" as AdminRole,
        allowedRooms: newRooms,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "เพิ่ม Admin แล้ว", description: email });
      setNewEmail("");
      setNewRooms([]);
    } catch (e) {
      console.error(e);
      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
    }
  };

  const handleSaveAdmin = async (row: AdminRow) => {
    if (row.allowedRooms.length === 0) {
      toast({
        title: "ต้องเลือกห้องอย่างน้อย 1 ห้อง",
        variant: "destructive",
      });
      return;
    }
    setSavingId(row.id);
    try {
      await setDoc(
        doc(db, "adminUsers", row.id),
        {
          email: row.email,
          role: "admin",
          allowedRooms: row.allowedRooms,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({ title: "บันทึกสิทธิ์แล้ว", description: row.email });
    } catch (e) {
      console.error(e);
      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveAdmin = async (row: AdminRow) => {
    if (!confirm(`ลบสิทธิ์ Admin ของ ${row.email}?`)) return;
    try {
      await deleteDoc(doc(db, "adminUsers", row.id));
      toast({ title: "ลบ Admin แล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    }
  };

  const RoomChecklist = ({
    selected,
    onToggle,
    idPrefix,
  }: {
    selected: string[];
    onToggle: (value: string) => void;
    idPrefix: string;
  }) => (
    <div className="grid sm:grid-cols-2 gap-2">
      {ROOMS.map((room) => (
        <label
          key={room.value}
          htmlFor={`${idPrefix}-${room.value}`}
          className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
        >
          <Checkbox
            id={`${idPrefix}-${room.value}`}
            checked={selected.includes(room.value)}
            onCheckedChange={() => onToggle(room.value)}
            className="mt-0.5"
          />
          <span className="text-sm leading-snug">{room.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          กำหนดสิทธิ์อนุมัติห้องประชุม (Admin)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Super Admin กำหนดว่า Admin แต่ละคนอนุมัติห้องใดได้ — Admin จะเห็นเฉพาะรายการรออนุมัติของห้องที่ได้รับอนุญาต
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            เพิ่ม Admin
          </CardTitle>
          <CardDescription>อีเมลต้องตรงกับบัญชี Firebase Auth ที่ใช้เข้าสู่ระบบ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-admin-email">อีเมล Admin</Label>
            <Input
              id="new-admin-email"
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>ห้องที่อนุญาตให้อนุมัติ</Label>
            <RoomChecklist selected={newRooms} onToggle={toggleNewRoom} idPrefix="new" />
          </div>
          <Button onClick={handleAddAdmin} className="gap-2">
            <UserPlus className="h-4 w-4" />
            เพิ่ม Admin
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin ที่มีอยู่ ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มี Admin — เพิ่มจากฟอร์มด้านบน</p>
          ) : (
            admins.map((admin, idx) => (
              <div key={admin.id}>
                {idx > 0 && <Separator className="mb-6" />}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Admin · {admin.allowedRooms.length} ห้อง
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={savingId === admin.id}
                      onClick={() => handleSaveAdmin(admin)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      บันทึก
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive"
                      onClick={() => handleRemoveAdmin(admin)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      ลบ
                    </Button>
                  </div>
                </div>
                <RoomChecklist
                  selected={admin.allowedRooms}
                  onToggle={(v) => toggleAdminRoom(admin.id, v)}
                  idPrefix={admin.id}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
