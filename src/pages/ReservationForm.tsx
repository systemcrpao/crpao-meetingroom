import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, ROOMS, EQUIPMENT_OPTIONS, TIME_SLOTS } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ReservationForm() {
  const { toast } = useToast();
  const [department, setDepartment] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [bookerName, setBookerName] = useState("");

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!department || !topic || !date || !startTime || !endTime || !room || !bookerName) {
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
      equipment,
      bookerName,
    };

    console.log("Reservation Data:", formData);

    toast({
      title: "บันทึกการจองสำเร็จ!",
      description: `จองห้อง ${room} วันที่ ${format(date, "d MMMM yyyy", { locale: th })}`,
    });

    // Reset form
    setDepartment("");
    setTopic("");
    setDate(undefined);
    setStartTime("");
    setEndTime("");
    setRoom("");
    setEquipment([]);
    setBookerName("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">แบบฟอร์มจองห้องประชุม</CardTitle>
          <CardDescription>กรุณากรอกรายละเอียดการจองห้องประชุม</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Department */}
            <div className="space-y-2">
              <Label>สังกัด / หน่วยงาน</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="เลือกหน่วยงาน" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label>เรื่อง / ชื่อโครงการ</Label>
              <Input placeholder="ระบุหัวข้อการประชุม" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>วันที่ประชุม</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "d MMMM yyyy", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เวลาเริ่ม</Label>
                <Select value={startTime} onValueChange={setStartTime}>
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
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger><SelectValue placeholder="เลือกเวลา" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>{t} น.</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label>ห้องประชุม</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger><SelectValue placeholder="เลือกห้องประชุม" /></SelectTrigger>
                <SelectContent>
                  {ROOMS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment */}
            <div className="space-y-3">
              <Label>อุปกรณ์ที่ต้องการ</Label>
              <div className="space-y-2">
                {EQUIPMENT_OPTIONS.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={item}
                      checked={equipment.includes(item)}
                      onCheckedChange={() => toggleEquipment(item)}
                    />
                    <label htmlFor={item} className="text-sm cursor-pointer">{item}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Booker Name */}
            <div className="space-y-2">
              <Label>ชื่อผู้จอง</Label>
              <Input placeholder="ระบุชื่อ-นามสกุล ผู้จอง" value={bookerName} onChange={(e) => setBookerName(e.target.value)} />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg">
              <Printer className="mr-2 h-4 w-4" />
              บันทึกและพิมพ์แบบฟอร์ม
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
