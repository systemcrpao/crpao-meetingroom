import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Shield, Save, Trash2, UserPlus } from "lucide-react";
import { db } from "@/lib/firebase";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import {
  adminDocId,
  allRoomValues,
  APP_ACCESS_DOC_ID,
  APP_CONFIG_COLLECTION,
  normalizeEmail,
  parseSuperAdminEmails,
  type AdminUserDoc,
  type AdminRole,
} from "@/lib/adminAccess";
import { useAdminProfile } from "@/contexts/AdminProfileContext";
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
  const { remoteSuperAdminEmails } = useAdminProfile();
  const { activeRooms } = useMeetingRooms();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newSuperEmail, setNewSuperEmail] = useState("");
  const [newRooms, setNewRooms] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingSuper, setSavingSuper] = useState(false);

  const envSuperEmails = useMemo(() => [...parseSuperAdminEmails()], []);
  const listedSuperEmails = useMemo(() => {
    const merged = new Set<string>([
      ...envSuperEmails,
      ...remoteSuperAdminEmails.map(normalizeEmail),
    ]);
    return [...merged].sort((a, b) => a.localeCompare(b, "th"));
  }, [envSuperEmails, remoteSuperAdminEmails]);

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

  const persistSuperAdminEmails = async (emails: string[]) => {
    const unique = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
    await setDoc(
      doc(db, APP_CONFIG_COLLECTION, APP_ACCESS_DOC_ID),
      { superAdminEmails: unique, updatedAt: serverTimestamp() },
      { merge: true },
    );
  };

  const handleAddSuperAdmin = async () => {
    const email = normalizeEmail(newSuperEmail);
    if (!email || !email.includes("@")) {
      toast({ title: "กรุณากรอกอีเมล Super Admin ให้ถูกต้อง", variant: "destructive" });
      return;
    }
    if (listedSuperEmails.includes(email)) {
      toast({ title: "อีเมลนี้อยู่ในรายชื่อ Super Admin แล้ว" });
      return;
    }
    setSavingSuper(true);
    try {
      const nextRemote = [...new Set([...remoteSuperAdminEmails.map(normalizeEmail), email])];
      await persistSuperAdminEmails(nextRemote);
      await setDoc(
        doc(db, "adminUsers", adminDocId(email)),
        {
          email,
          role: "super_admin" as AdminRole,
          allowedRooms: allRoomValues(activeRooms),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({
        title: "เพิ่ม Super Admin แล้ว",
        description: `${email} สามารถเข้าแผงผู้ดูแลได้ทันที (ไม่ต้อง deploy ใหม่)`,
      });
      setNewSuperEmail("");
    } catch (e) {
      console.error(e);
      toast({ title: "บันทึก Super Admin ไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSavingSuper(false);
    }
  };

  const handleRemoveSuperAdmin = async (email: string) => {
    const key = normalizeEmail(email);
    if (envSuperEmails.includes(key)) {
      toast({
        title: "ลบจากรายการนี้ไม่ได้",
        description: "อีเมลนี้มาจาก VITE_SUPER_ADMIN_EMAILS ตอน build — แก้ที่ Secret/env แล้ว deploy ใหม่",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`เอา ${email} ออกจาก Super Admin?`)) return;
    try {
      const nextRemote = remoteSuperAdminEmails
        .map(normalizeEmail)
        .filter((e) => e !== key);
      await persistSuperAdminEmails(nextRemote);
      await deleteDoc(doc(db, "adminUsers", adminDocId(key)));
      toast({ title: "ลบ Super Admin แล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    }
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
      {activeRooms.map((room) => (
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

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Super Admin
          </CardTitle>
          <CardDescription>
            เพิ่มอีเมลที่เข้าแผงผู้ดูthenได้เต็มสิทธิ์ — เก็บใน Firestore ใช้ได้ทันทีบน GitHub Pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="superadmin@example.com"
              value={newSuperEmail}
              onChange={(e) => setNewSuperEmail(e.target.value)}
            />
            <Button onClick={handleAddSuperAdmin} disabled={savingSuper} className="shrink-0 gap-2">
              <UserPlus className="h-4 w-4" />
              เพิ่ม Super Admin
            </Button>
          </div>
          {listedSuperEmails.length > 0 ? (
            <ul className="space-y-2">
              {listedSuperEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>{email}</span>
                  <div className="flex items-center gap-2">
                    {envSuperEmails.includes(email) ? (
                      <Badge variant="outline" className="text-[10px]">
                        จาก env
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive"
                        onClick={() => handleRemoveSuperAdmin(email)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มี Super Admin ใน Firestore — ใช้ VITE_SUPER_ADMIN_EMAILS หรือเพิ่มด้านบน</p>
          )}
        </CardContent>
      </Card>

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
