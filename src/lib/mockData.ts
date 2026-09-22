/** ค่าคงที่ของระบบจองห้องประชุม (ห้อง หน่วยงาน อุปกรณ์ ช่วองเวลา สี) — ข้อมูลจองจริงอยู่ใน Firestore */

export const DEPARTMENTS = [
  "สำนักปลัดองค์การบริหารส่วนจังหวัด",
  "สำนักช่าง",
  "สำนักการศึกษา ศาสนาและวัฒนธรรม",
  "กองคลัง",
  "กองยุทธศาสตร์และงบประมาณ",
  "กองสวัสดิการสังคม",
  "กองป้องกันและบรรเทาสาธารณภัย",
  "กองการเจ้าหน้าที่",
  "กองสาธารณสุข",
  "สำนักงานเลขานุการองค์การบริหารส่วนจังหวัด",
  "กองการท่องเที่ยวและกีฬา",
  "หน่วยตรวจสอบภายใน",
  "หน่วยงานอื่น ๆ",
];

export const DEPARTMENT_OTHER = "หน่วยงานอื่น ๆ";

/** ชื่อหน่วยงานสำหรับแสดงผล / พิมพ์ (ไม่แสดงคำว่า "หน่วยงานอื่น ๆ" ถ้ามีชื่อที่กรอกเพิ่ม) */
export function resolveDepartmentForDisplay(data: {
  department?: unknown;
  departmentOther?: unknown;
}): string {
  const dept = String(data.department ?? "");
  const other = String(data.departmentOther ?? "").trim();
  if (dept === DEPARTMENT_OTHER) return other || dept;
  return dept;
}

export const ROOMS = [
  { value: "ธรรมปัญญา", label: "ห้องประชุมธรรมปัญญา (180-200 คน)" },
  { value: "ธรรมรับอรุณ", label: "ห้องประชุมธรรมรับอรุณ (40-50 คน)" },
  { value: "ยอแสงธรรม", label: "ห้องประชุมยอแสงธรรม (40-50 คน)" },
  { value: "รุ่งอรุณ", label: "ห้องประชุมรุ่งอรุณ (5-20 คน)" },
  { value: "เก้าจอม", label: "ห้องเก้าจอม (ห้องรับรองแขก VIP)" },
];

/** แมปชื่อห้องเก่าใน Firestore → ชื่อปัจจุบัน */
export function resolveRoom(room: string): string {
  if (room === "นครธรรม") return "รุ่งอรุณ";
  return room;
}

export function getRoomLabel(room: string): string {
  const key = resolveRoom(room);
  return ROOMS.find((r) => r.value === key)?.label ?? room;
}

export function roomMatchesFilter(storedRoom: string, filter: string): boolean {
  if (filter === "all") return true;
  return resolveRoom(storedRoom) === filter;
}

export function roomColorClass(room: string, light = false): string {
  const key = resolveRoom(room);
  const map = light ? ROOM_COLORS_LIGHT : ROOM_COLORS;
  return map[key] ?? "";
}

export const EQUIPMENT_OPTIONS = [
  "เครื่องเสียง พร้อม Microphone",
  "เครื่องฉาย Projector",
  "โทรทัศน์แอลอีดี TV LED",
  "อุปกรณ์ต่อพ่วง",
  "ระบบอินเตอร์เน็ต",
  "ระบบประชุมวีดิทัศน์ทางไกล VCS",
];

export const ROOM_COLORS: Record<string, string> = {
  "ธรรมปัญญา": "bg-[hsl(var(--room-green))]",
  "ธรรมรับอรุณ": "bg-[hsl(var(--room-blue))]",
  "ยอแสงธรรม": "bg-[hsl(var(--room-purple))]",
  "รุ่งอรุณ": "bg-[hsl(var(--room-red))]",
  "เก้าจอม": "bg-[hsl(var(--room-orange))]",
};

export const ROOM_COLORS_LIGHT: Record<string, string> = {
  "ธรรมปัญญา": "bg-[hsl(var(--room-green)/0.15)] text-[hsl(var(--room-green))] border-[hsl(var(--room-green)/0.3)]",
  "ธรรมรับอรุณ": "bg-[hsl(var(--room-blue)/0.15)] text-[hsl(var(--room-blue))] border-[hsl(var(--room-blue)/0.3)]",
  "ยอแสงธรรม": "bg-[hsl(var(--room-purple)/0.15)] text-[hsl(var(--room-purple))] border-[hsl(var(--room-purple)/0.3)]",
  "รุ่งอรุณ": "bg-[hsl(var(--room-red)/0.15)] text-[hsl(var(--room-red))] border-[hsl(var(--room-red)/0.3)]",
  "เก้าจอม": "bg-[hsl(var(--room-orange)/0.15)] text-[hsl(var(--room-orange))] border-[hsl(var(--room-orange)/0.3)]",
};

export const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}).filter((t) => {
  const h = parseInt(t.split(":")[0]);
  return h >= 8 && h <= 18;
});
