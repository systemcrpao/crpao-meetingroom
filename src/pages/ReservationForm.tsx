import { useState, useMemo } from "react";
import { format, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Printer, Building2, BookOpen, Clock3, DoorOpen, MonitorSpeaker, UserCircle2, Users, CheckCircle2, Copy, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, ROOMS, EQUIPMENT_OPTIONS, TIME_SLOTS } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { generateReservationPDF } from "@/lib/pdfGenerator";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Generate unique 5-character tracking number (uppercase + digits, no ambiguous chars)
const TRACKING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
function generateTrackingNumber(): string {
  let code = "";
  const arr = new Uint8Array(5);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 5; i++) {
    code += TRACKING_CHARS[arr[i] % TRACKING_CHARS.length];
  }
  return code;
}

async function getUniqueTrackingNumber(): Promise<string> {
  // Try up to 10 times to find a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateTrackingNumber();
    const snap = await getDocs(
      query(collection(db, "reservations"), where("trackingNumber", "==", code))
    );
    if (snap.empty) return code;
  }
  // Fallback: very unlikely to collide
  return generateTrackingNumber();
}

export default function ReservationForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [department, setDepartment] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [participants, setParticipants] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [bookerName, setBookerName] = useState("");
  const [bookerPosition, setBookerPosition] = useState("");
  const [bookerPhone, setBookerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state
  const [submitted, setSubmitted] = useState(false);
  const [savedTrackingNumber, setSavedTrackingNumber] = useState("");
  const [savedFormData, setSavedFormData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Compute filtered end time slots based on selected start time
  const filteredEndTimeSlots = useMemo(() => {
    if (!startTime) return TIME_SLOTS;
    return TIME_SLOTS.filter((t) => t > startTime);
  }, [startTime]);

  // Today for disabling past dates
  const today = startOfDay(new Date());

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!department || !topic || !date || !startTime || !endTime || !room || !participants || !bookerName || !bookerPosition || !bookerPhone) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "โปรดตรวจสอบและกรอกข้อมูลทุกช่องที่จำเป็น",
        variant: "destructive",
      });
      return;
    }

    const formData = {
      department,
      topic,
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      room,
      participants,
      equipment,
      bookerName,
      bookerPosition,
      bookerPhone,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    // --- ตรวจสอบการจองซ้ำ (overlap check) ---
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const newStart = toMinutes(startTime);
    const newEnd   = toMinutes(endTime);

    if (newEnd <= newStart) {
      toast({
        title: "เวลาไม่ถูกต้อง",
        description: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Query รายการจองห้องเดียวกัน วันเดียวกัน ที่ยังไม่เคยปฏิเสธ
      const conflictSnap = await getDocs(
        query(
          collection(db, "reservations"),
          where("room", "==", room),
          where("date", "==", formData.date),
          where("status", "in", ["pending", "approved"])
        )
      );
      const hasOverlap = conflictSnap.docs.some((d) => {
        const r = d.data();
        const rs = toMinutes(r.startTime);
        const re = toMinutes(r.endTime);
        return newStart < re && newEnd > rs; // interval overlap formula
      });
      if (hasOverlap) {
        toast({
          title: "ห้องประชุมถูกจองแล้วในช่วงเวลานี้",
          description: `ห้อง ${room} มีการจองที่คาบเกี่ยวกันในวันดังกล่าว กรุณาเลือกเวลาอื่นหรือห้องอื่น`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Generate unique tracking number first
      const trackingNumber = await getUniqueTrackingNumber();

      const formDataWithTracking = {
        ...formData,
        trackingNumber,
      };

      await addDoc(collection(db, "reservations"), formDataWithTracking);

      toast({
        title: "บันทึกการจองสำเร็จ!",
        description: `จองห้อง ${room} หมายเลขติดตาม: ${trackingNumber}`,
      });

      // Save form data for success screen
      setSavedTrackingNumber(trackingNumber);
      setSavedFormData(formDataWithTracking);
      setSubmitted(true);
    } catch (error) {
      console.error("Error saving reservation:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(savedTrackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewBooking = () => {
    setSubmitted(false);
    setSavedTrackingNumber("");
    setSavedFormData(null);
    setDepartment("");
    setTopic("");
    setDate(undefined);
    setStartTime("");
    setEndTime("");
    setRoom("");
    setParticipants("");
    setEquipment([]);
    setBookerName("");
    setBookerPosition("");
    setBookerPhone("");
  };

  // ===== SUCCESS SCREEN =====
  if (submitted && savedTrackingNumber) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-5 py-6 text-center text-white">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 drop-shadow" />
            <h2 className="text-lg font-bold">บันทึกการจองสำเร็จ!</h2>
            <p className="text-green-100 text-sm mt-1">กรุณาบันทึกหมายเลขติดตามไว้เพื่อตรวจสอบสถานะการจอง</p>
          </div>

          <CardContent className="p-5 space-y-5">
            {/* Tracking Number */}
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">หมายเลขติดตาม</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold font-mono tracking-[0.3em] text-primary">
                  {savedTrackingNumber}
                </span>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
                  <Copy className="h-4 w-4" />
                  {copied && <span className="text-xs ml-1 text-green-600">คัดลอกแล้ว!</span>}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">เรื่อง</p>
                <p className="font-medium">{savedFormData?.topic}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ห้องประชุม</p>
                <Badge variant="outline" className="text-xs mt-0.5">{savedFormData?.room}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">วันที่</p>
                <p className="font-medium">
                  {savedFormData?.date && date
                    ? `${format(date, "d MMMM", { locale: th })} ${date.getFullYear() + 543}`
                    : savedFormData?.date}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">เวลา</p>
                <p className="font-medium">{savedFormData?.startTime}–{savedFormData?.endTime} น.</p>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                onClick={() => generateReservationPDF(savedFormData)}
              >
                <Printer className="h-4 w-4" />
                พิมพ์แบบฟอร์มจองห้องประชุม
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => navigate("/tracking")}
                >
                  <FileSearch className="h-4 w-4" />
                  ติดตามสถานะ
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleNewBooking}
                >
                  <BookOpen className="h-4 w-4" />
                  จองรายการใหม่
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="overflow-hidden border-0 shadow-md">
        {/* Gradient header banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-4">
          <CardTitle className="text-white text-base font-semibold tracking-wide flex items-center gap-2">
            <BookOpen className="h-4 w-4 opacity-90" />
            แบบฟอร์มจองห้องประชุม
          </CardTitle>
          <p className="text-blue-100 text-xs mt-0.5">กรุณากรอกรายละเอียดการจองให้ครบถ้วน</p>
        </div>

        <CardContent className="px-5 pb-5 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── ข้อมูลการประชุม ── */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">ข้อมูลการประชุม</span>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" /> สังกัด / หน่วยงาน
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="เลือกหน่วยงาน" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> เรื่อง / ชื่อโครงการ
              </Label>
              <Input className="h-9 text-sm" placeholder="ระบุหัวข้อการประชุม" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>

            <Separator className="my-1" />

            {/* ── วันและเวลา ── */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">วันและเวลา</span>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-emerald-500" /> วันที่ประชุม
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full h-9 justify-start text-left text-sm font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-emerald-500" />
                    {date ? `${format(date, "d MMMM", { locale: th })} ${date.getFullYear() + 543}` : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { setDate(d); setCalendarOpen(false); }}
                    disabled={(d) => d < today}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-emerald-500" /> เวลาเริ่ม
                </Label>
                <Select value={startTime} onValueChange={(v) => { setStartTime(v); if (endTime && endTime <= v) setEndTime(""); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="เลือกเวลา" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>{t} น.</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-emerald-500" /> เวลาสิ้นสุด
                </Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="เลือกเวลา" /></SelectTrigger>
                  <SelectContent>
                    {filteredEndTimeSlots.map((t) => (
                      <SelectItem key={t} value={t}>{t} น.</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-1" />

            {/* ── ห้องและอุปกรณ์ ── */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">ห้องและอุปกรณ์</span>
            </div>

            {/* Room */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <DoorOpen className="h-3.5 w-3.5 text-orange-500" /> ห้องประชุม
              </Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="เลือกห้องประชุม" /></SelectTrigger>
                <SelectContent>
                  {ROOMS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Participants */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-orange-500" /> จำนวนผู้เข้าร่วม (คน)
              </Label>
              <Input className="h-9 text-sm" placeholder="ระบุจำนวนผู้เข้าร่วม" value={participants} onChange={(e) => setParticipants(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <MonitorSpeaker className="h-3.5 w-3.5 text-orange-500" /> อุปกรณ์ที่ต้องการ
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {EQUIPMENT_OPTIONS.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={item}
                      checked={equipment.includes(item)}
                      onCheckedChange={() => toggleEquipment(item)}
                    />
                    <label htmlFor={item} className="text-xs cursor-pointer">{item}</label>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-1" />

            {/* ── ข้อมูลผู้จอง ── */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-pink-500" />
              <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide">ข้อมูลผู้จอง</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <UserCircle2 className="h-3.5 w-3.5 text-pink-500" /> ชื่อผู้จอง
              </Label>
              <Input className="h-9 text-sm" placeholder="ระบุชื่อ-นามสกุล ผู้จอง" value={bookerName} onChange={(e) => setBookerName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">ตำแหน่ง</Label>
                <Input className="h-9 text-sm" placeholder="เช่น นักวิชาการ" value={bookerPosition} onChange={(e) => setBookerPosition(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">เบอร์โทรศัพท์</Label>
                <Input className="h-9 text-sm" placeholder="08x-xxx-xxxx" value={bookerPhone} onChange={(e) => setBookerPhone(e.target.value.replace(/\D/g, ''))} inputMode="tel" />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm mt-2"
              disabled={isSubmitting}
            >
              <Printer className="mr-2 h-4 w-4" />
              {isSubmitting ? "กำลังบันทึกข้อมูล..." : "บันทึกและพิมพ์แบบฟอร์ม"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
