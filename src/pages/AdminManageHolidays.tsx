import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  CUSTOM_HOLIDAYS_COLLECTION,
  CUSTOM_HOLIDAY_TYPE_OPTIONS,
  buddhistYearFromDateString,
  dateWithinCeYear,
  sortCustomHolidaysByDate,
  type CustomHoliday,
  type CustomHolidayType,
} from "@/lib/customHolidays";
import {
  buildBuddhistYearOptions,
  ceYearFromBuddhist,
  formatDateThaiLongBE,
  toBuddhistYear,
} from "@/lib/thaiDate";
import { holidayTypeLabel } from "@/lib/thaiPublicHolidays";
import { useToast } from "@/hooks/use-toast";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const beYearOptions = buildBuddhistYearOptions(2, 5);

export default function AdminManageHolidays() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CustomHoliday[]>([]);
  const [selectedBeYear, setSelectedBeYear] = useState(() => toBuddhistYear(new Date()));
  const [date, setDate] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [holidayType, setHolidayType] = useState<CustomHolidayType>("substitution_holiday");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const ceYear = ceYearFromBuddhist(selectedBeYear);
  const dateMin = `${ceYear}-01-01`;
  const dateMax = `${ceYear}-12-31`;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, CUSTOM_HOLIDAYS_COLLECTION), (snap) => {
      setRows(
        sortCustomHolidaysByDate(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomHoliday),
        ),
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setDate("");
  }, [selectedBeYear]);

  const yearRows = useMemo(
    () => rows.filter((r) => r.buddhistYear === selectedBeYear),
    [rows, selectedBeYear],
  );

  const handleAdd = async () => {
    const name = nameTh.trim();
    if (!date || !name) {
      toast({ title: "กรุณาเลือกวันที่และชื่อวันหยุด", variant: "destructive" });
      return;
    }
    if (!dateWithinCeYear(date, ceYear)) {
      toast({
        title: "วันที่ไม่ตรงกับปีที่เลือก",
        description: `กรุณาเลือกวันที่ในปี พ.ศ. ${selectedBeYear}`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, CUSTOM_HOLIDAYS_COLLECTION), {
        date,
        name_th: name,
        name_en: name,
        type: holidayType,
        buddhistYear: buddhistYearFromDateString(date),
        note: note.trim() || null,
        createdAt: serverTimestamp(),
      });
      setNameTh("");
      setNote("");
      setDate("");
      toast({ title: "เพิ่มวันหยุดแล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CustomHoliday) => {
    if (!window.confirm(`ลบวันหยุด «${row.name_th}» (${formatDateThaiLongBE(row.date)}) ?`)) return;
    try {
      await deleteDoc(doc(db, CUSTOM_HOLIDAYS_COLLECTION, row.id));
      toast({ title: "ลบแล้ว" });
    } catch (e) {
      console.error(e);
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarPlus className="h-7 w-7 text-primary" />
          เพิ่มวันหยุด
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          วันหยุดที่เพิ่มที่นี่จะแสดงบนปฏิทินหน้าจองสาธารณะและปฏิทินแอดมิน (รวมกับวันหยุดราชการจากข้อมูลกลาง)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>เพิ่มวันหยุดตามปี พ.ศ.</CardTitle>
          <CardDescription>
            เลือกปีก่อน แล้วระบุวันที่ในปีนั้น — เช่น 14 กุมภาพันธ์ 2570 เป็นวันหยุดชดเชย
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>ปี พ.ศ.</Label>
              <Select
                value={String(selectedBeYear)}
                onValueChange={(v) => setSelectedBeYear(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {beYearOptions.map((be) => (
                    <SelectItem key={be} value={String(be)}>
                      {be}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">วันที่</Label>
              <Input
                id="holiday-date"
                type="date"
                min={dateMin}
                max={dateMax}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="holiday-name">ชื่อวันหยุด (ภาษาไทย)</Label>
              <Input
                id="holiday-name"
                placeholder="เช่น วันหยุดชดเชย"
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select value={holidayType} onValueChange={(v) => setHolidayType(v as CustomHolidayType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_HOLIDAY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="holiday-note">หมายเหตุ (ไม่บังคับ)</Label>
              <Input
                id="holiday-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "เพิ่มวันหยุด"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการวันหยุดที่เพิ่ม — พ.ศ. {selectedBeYear}</CardTitle>
          <CardDescription>{yearRows.length} รายการ</CardDescription>
        </CardHeader>
        <CardContent>
          {yearRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              ยังไม่มีวันหยุดเพิ่มเติมในปีนี้
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatDateThaiLongBE(row.date)}</TableCell>
                    <TableCell>{row.name_th}</TableCell>
                    <TableCell>{holidayTypeLabel(row.type)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(row)}
                        aria-label="ลบ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
