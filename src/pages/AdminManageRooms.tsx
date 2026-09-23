import { useEffect, useMemo, useState } from "react";
import { doc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { DoorOpen, Plus, Save, Database } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  DEFAULT_MEETING_ROOMS,
  MEETING_ROOMS_COLLECTION,
  ROOM_COLOR_OPTIONS,
  meetingRoomDocId,
  roomSolidColorClass,
  sortMeetingRooms,
  type MeetingRoom,
  type RoomColorKey,
} from "@/lib/meetingRooms";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditableRoom = MeetingRoom;

export default function AdminManageRooms() {
  const { toast } = useToast();
  const { allRooms, fromFirestore, loading } = useMeetingRooms();
  const [rows, setRows] = useState<EditableRoom[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<RoomColorKey>("teal");

  useEffect(() => {
    if (!loading) setRows(sortMeetingRooms(allRooms));
  }, [allRooms, loading]);

  const nextSortOrder = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0),
    [rows],
  );

  const updateRow = (id: string, patch: Partial<EditableRoom>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_MEETING_ROOMS.forEach((room) => {
        const id = meetingRoomDocId(room.value);
        batch.set(doc(db, MEETING_ROOMS_COLLECTION, id), {
          value: room.value,
          label: room.label,
          enabled: room.enabled,
          sortOrder: room.sortOrder,
          colorKey: room.colorKey,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast({ title: "นำเข้าห้องเริ่มต้นแล้ว", description: "แก้ไขหรือปิดใช้งานได้จากรายการด้านล่าง" });
    } catch (e) {
      console.error(e);
      toast({ title: "นำเข้าไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveRow = async (row: EditableRoom) => {
    const value = row.value.trim();
    const label = row.label.trim();
    if (!value || !label) {
      toast({ title: "กรุณากรอกชื่อห้องและคำอธิบาย", variant: "destructive" });
      return;
    }
    setSavingId(row.id);
    try {
      const id = meetingRoomDocId(value);
      await setDoc(
        doc(db, MEETING_ROOMS_COLLECTION, id),
        {
          value,
          label,
          enabled: row.enabled,
          sortOrder: row.sortOrder,
          colorKey: row.colorKey,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({ title: "บันทึกห้องแล้ว", description: value });
    } catch (e) {
      console.error(e);
      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleAddRoom = async () => {
    const value = newValue.trim();
    const label = newLabel.trim();
    if (!value || !label) {
      toast({ title: "กรุณากรอกชื่อย่อและชื่อเต็มของห้อง", variant: "destructive" });
      return;
    }
    if (rows.some((r) => r.value === value)) {
      toast({ title: "มีห้องชื่อนี้แล้ว", variant: "destructive" });
      return;
    }
    try {
      const id = meetingRoomDocId(value);
      await setDoc(doc(db, MEETING_ROOMS_COLLECTION, id), {
        value,
        label,
        enabled: true,
        sortOrder: nextSortOrder,
        colorKey: newColor,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "เพิ่มห้องประชุมแล้ว", description: value });
      setNewValue("");
      setNewLabel("");
      setNewColor("teal");
    } catch (e) {
      console.error(e);
      toast({ title: "เพิ่มห้องไม่สำเร็จ", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          จัดการห้องประชุม
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Super Admin เพิ่ม/แก้ไข/ปิดใช้งานห้อง — ฟอร์มจองและปฏิทินจะแสดงเฉพาะห้องที่เปิดใช้งาน
        </p>
      </div>

      {!fromFirestore && !loading && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              ยังใช้รายการห้องเริ่มต้น
            </CardTitle>
            <CardDescription>
              กดปุ่มด้านล่างเพื่อบันทึกห้องเริ่มต้นลง Firestore แล้วจัดการได้เต็มรูปแบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSeedDefaults} disabled={seeding} className="gap-2">
              <Database className="h-4 w-4" />
              นำเข้าห้องเริ่มต้น ({DEFAULT_MEETING_ROOMS.length} ห้อง)
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มห้องประชุม
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="room-value">ชื่อห้อง (ใช้ในระบบ)</Label>
              <Input
                id="room-value"
                placeholder="เช่น ธรรมปัญญา"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-label">ชื่อแสดงในฟอร์ม</Label>
              <Input
                id="room-label"
                placeholder="ห้องประชุม… (ความจุ)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label>สีในปฏิทิน</Label>
            <Select value={newColor} onValueChange={(v) => setNewColor(v as RoomColorKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-sm", roomSolidColorClass(c.key))} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddRoom} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มห้อง
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายการห้อง ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-4 w-4 rounded-sm shrink-0", roomSolidColorClass(row.colorKey))} />
                  <span className="font-medium">{row.value}</span>
                  {!row.enabled && (
                    <Badge variant="secondary" className="text-[10px]">
                      ปิดใช้งาน
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${row.id}`} className="text-xs text-muted-foreground">
                    เปิดจอง
                  </Label>
                  <Switch
                    id={`enabled-${row.id}`}
                    checked={row.enabled}
                    onCheckedChange={(checked) => updateRow(row.id, { enabled: checked })}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={savingId === row.id}
                    onClick={() => handleSaveRow(row)}
                  >
                    <Save className="h-3.5 w-3.5" />
                    บันทึก
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">ชื่อแสดง</Label>
                  <Input
                    value={row.label}
                    onChange={(e) => updateRow(row.id, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">สีปฏิทิน</Label>
                  <Select
                    value={row.colorKey}
                    onValueChange={(v) => updateRow(row.id, { colorKey: v as RoomColorKey })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
