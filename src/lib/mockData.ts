export interface Reservation {
  id: string;
  department: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  equipment: string[];
  bookerName: string;
  status: "pending" | "approved" | "rejected";
}

export const DEPARTMENTS = [
  "สำนักปลัดองค์การบริหารส่วนจังหวัด",
  "กองช่าง",
  "สำนักการศึกษา ศาสนาและวัฒนธรรม",
  "กองคลัง",
  "กองยุทธศาสตร์และงบประมาณ",
  "กองสวัสดิการ",
  "กองป้องกันและบรรเทาสาธารณภัย",
  "กองการเจ้าหน้าที่",
  "กองสาธารณสุข",
  "สำนักงานเลขานุการองค์การบริหารส่วนจังหวัด",
  "กองการท่องเที่ยวและกีฬา",
  "หน่วยตรวจสอบภายใน",
  "กองทุนฟื้นฟูสมรรถภาพจังหวัด",
  "หน่วยงานอื่น ๆ",
];

export const ROOMS = [
  { value: "ธรรมปัญญา", label: "ห้องประชุมธรรมปัญญา (180-200 คน)" },
  { value: "ธรรมรับอรุณ", label: "ห้องประชุมธรรมรับอรุณ (40-50 คน)" },
  { value: "ยอแสงธรรม", label: "ห้องประชุมยอแสงธรรม (40-50 คน)" },
  { value: "นครธรรม", label: "ห้องประชุมนครธรรม (5-15 คน)" },
  { value: "รุ่งอรุณ", label: "ห้องประชุมรุ่งอรุณ (5-20 คน)" },
];

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
  "นครธรรม": "bg-[hsl(var(--room-orange))]",
  "รุ่งอรุณ": "bg-[hsl(var(--room-red))]",
};

export const ROOM_COLORS_LIGHT: Record<string, string> = {
  "ธรรมปัญญา": "bg-[hsl(var(--room-green)/0.15)] text-[hsl(var(--room-green))] border-[hsl(var(--room-green)/0.3)]",
  "ธรรมรับอรุณ": "bg-[hsl(var(--room-blue)/0.15)] text-[hsl(var(--room-blue))] border-[hsl(var(--room-blue)/0.3)]",
  "ยอแสงธรรม": "bg-[hsl(var(--room-purple)/0.15)] text-[hsl(var(--room-purple))] border-[hsl(var(--room-purple)/0.3)]",
  "นครธรรม": "bg-[hsl(var(--room-orange)/0.15)] text-[hsl(var(--room-orange))] border-[hsl(var(--room-orange)/0.3)]",
  "รุ่งอรุณ": "bg-[hsl(var(--room-red)/0.15)] text-[hsl(var(--room-red))] border-[hsl(var(--room-red)/0.3)]",
};

export const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}).filter((t) => {
  const h = parseInt(t.split(":")[0]);
  return h >= 8 && h <= 18;
});

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: "1",
    department: "สำนักปลัด",
    topic: "ประชุมสภาสมัยสามัญ ครั้งที่ 1/2568",
    date: formatDate(today),
    startTime: "09:00",
    endTime: "12:00",
    room: "ธรรมปัญญา",
    equipment: ["เครื่องเสียง พร้อม Microphone", "เครื่องฉาย Projector"],
    bookerName: "นายสมชาย ใจดี",
    status: "approved",
  },
  {
    id: "2",
    department: "กองช่าง",
    topic: "ประชุมแผนพัฒนาโครงสร้างพื้นฐาน",
    date: formatDate(today),
    startTime: "13:00",
    endTime: "15:00",
    room: "ธรรมรับอรุณ",
    equipment: ["เครื่องฉาย Projector", "ระบบอินเตอร์เน็ต"],
    bookerName: "นางสาวสมหญิง รักดี",
    status: "approved",
  },
  {
    id: "3",
    department: "กองคลัง",
    topic: "ประชุมงบประมาณประจำปี 2568",
    date: formatDate(addDays(today, 1)),
    startTime: "09:00",
    endTime: "11:30",
    room: "ยอแสงธรรม",
    equipment: ["เครื่องเสียง พร้อม Microphone", "โทรทัศน์แอลอีดี TV LED"],
    bookerName: "นายวิชัย คุณธรรม",
    status: "approved",
  },
  {
    id: "4",
    department: "กองยุทธศาสตร์และงบประมาณ",
    topic: "หารือแผนยุทธศาสตร์ระยะ 5 ปี",
    date: formatDate(addDays(today, 1)),
    startTime: "14:00",
    endTime: "16:00",
    room: "นครธรรม",
    equipment: ["ระบบประชุมวีดิทัศน์ทางไกล VCS", "ระบบอินเตอร์เน็ต"],
    bookerName: "นางประภา แสงทอง",
    status: "approved",
  },
  {
    id: "5",
    department: "สำนักปลัด",
    topic: "ประชุมคณะกรรมการพิจารณาโครงการ",
    date: formatDate(addDays(today, 2)),
    startTime: "10:00",
    endTime: "12:00",
    room: "รุ่งอรุณ",
    equipment: ["เครื่องเสียง พร้อม Microphone"],
    bookerName: "นายธนกฤต สุขสันต์",
    status: "approved",
  },
  // Pending requests
  {
    id: "6",
    department: "กองช่าง",
    topic: "ประชุมติดตามความก้าวหน้าโครงการก่อสร้าง",
    date: formatDate(addDays(today, 3)),
    startTime: "09:00",
    endTime: "11:00",
    room: "ธรรมรับอรุณ",
    equipment: ["เครื่องฉาย Projector"],
    bookerName: "นายประเสริฐ มั่นคง",
    status: "pending",
  },
  {
    id: "7",
    department: "กองคลัง",
    topic: "อบรมระบบการเงินอิเล็กทรอนิกส์",
    date: formatDate(addDays(today, 3)),
    startTime: "13:00",
    endTime: "16:00",
    room: "ธรรมปัญญา",
    equipment: ["เครื่องเสียง พร้อม Microphone", "เครื่องฉาย Projector", "ระบบอินเตอร์เน็ต"],
    bookerName: "นางสาวพิมพ์ใจ สว่างศรี",
    status: "pending",
  },
  {
    id: "8",
    department: "สำนักปลัด",
    topic: "ประชุมเตรียมงานพิธีวันสำคัญ",
    date: formatDate(addDays(today, 4)),
    startTime: "10:00",
    endTime: "12:00",
    room: "ยอแสงธรรม",
    equipment: ["เครื่องเสียง พร้อม Microphone", "โทรทัศน์แอลอีดี TV LED"],
    bookerName: "นายอนันต์ ศรีสุข",
    status: "pending",
  },
];
