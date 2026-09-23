/** ค่าคงที่ของระบบจองห้องประชุม (หน่วยงาน อุปกรณ์ ช่วองเวลา) — ห้องประชุมโหลดจาก Firestore */

import {
  DEFAULT_MEETING_ROOMS,
  getRoomLabelFromList,
  roomColorClassFromList,
  roomMatchesFilterWithList,
  roomSolidColorClass,
  resolveRoom,
  type MeetingRoom,
} from "@/lib/meetingRooms";

export { resolveRoom };

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

export function resolveDepartmentForDisplay(data: {
  department?: unknown;
  departmentOther?: unknown;
}): string {
  const dept = String(data.department ?? "");
  const other = String(data.departmentOther ?? "").trim();
  if (dept === DEPARTMENT_OTHER) return other || dept;
  return dept;
}

/** รูปแบบเดิม { value, label } — ค่าเริ่มต้น */
export const ROOMS = DEFAULT_MEETING_ROOMS.map(({ value, label }) => ({ value, label }));

export function getRoomLabel(
  room: string,
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
): string {
  return getRoomLabelFromList(room, rooms);
}

export function roomMatchesFilter(
  storedRoom: string,
  filter: string,
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
): boolean {
  return roomMatchesFilterWithList(storedRoom, filter, rooms);
}

export function roomColorClass(
  room: string,
  light = false,
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
): string {
  return roomColorClassFromList(room, rooms, light);
}

export const EQUIPMENT_OPTIONS = [
  "เครื่องเสียง พร้อม Microphone",
  "เครื่องฉาย Projector",
  "โทรทัศน์แอลอีดี TV LED",
  "อุปกรณ์ต่อพ่วง",
  "ระบบอินเตอร์เน็ต",
  "ระบบประชุมวีดิทัศน์ทางไกล VCS",
];

/** @deprecated ใช้ roomSolidColorClass(colorKey) กับ MeetingRoom แทน */
export const ROOM_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_MEETING_ROOMS.map((r) => [r.value, roomSolidColorClass(r.colorKey)]),
);

/** @deprecated */
export const ROOM_COLORS_LIGHT: Record<string, string> = Object.fromEntries(
  DEFAULT_MEETING_ROOMS.map((r) => [
    r.value,
    roomColorClassFromList(r.value, DEFAULT_MEETING_ROOMS, true),
  ]),
);

export const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}).filter((t) => {
  const h = parseInt(t.split(":")[0]);
  return h >= 8 && h <= 18;
});
