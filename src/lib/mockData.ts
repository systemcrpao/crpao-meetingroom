/** ค่าคงที่ของระบบจองห้องประชุม (หน่วยงาน อุปกรณ์ ช่วองเวลา) — ห้องประชุมโหลดจาก Firestore */

import {
  DEFAULT_MEETING_ROOMS,
  findMeetingRoom,
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

export const VCS_EQUIPMENT_LABEL = "ระบบประชุมวีดิทัศน์ทางไกล VCS";

const TV_LED_EQUIPMENT = "โทรทัศน์แอลอีดี TV LED";
const PROJECTOR_EQUIPMENT = "เครื่องฉาย Projector";

/** ห้องอรุณเบิกฟ้า — ไม่ให้เลือกอุปกรณ์บางรายการ */
export const ARUN_BERK_FA_ROOM = "อรุณเบิกฟ้า";

const EQUIPMENT_HIDDEN_FOR_ARUN_BERK_FA = new Set([
  PROJECTOR_EQUIPMENT,
  "อุปกรณ์ต่อพ่วง",
  "ระบบอินเตอร์เน็ต",
  VCS_EQUIPMENT_LABEL,
]);

const EQUIPMENT_HIDDEN_FOR_SAPHA = new Set([TV_LED_EQUIPMENT, VCS_EQUIPMENT_LABEL]);

const EQUIPMENT_HIDDEN_FOR_RUNG_ARUN = new Set([PROJECTOR_EQUIPMENT]);

function roomValueAndLabel(storedRoom: string, rooms: MeetingRoom[]) {
  const value = resolveRoom(storedRoom).trim();
  const def = findMeetingRoom(storedRoom, rooms);
  const label = (def?.label ?? "").trim();
  return { value, label };
}

function roomMatches(
  storedRoom: string,
  rooms: MeetingRoom[],
  opts: { values?: string[]; valueIncludes?: string[]; labelIncludes?: string[] },
): boolean {
  const { value, label } = roomValueAndLabel(storedRoom, rooms);
  if (opts.values?.some((v) => value === v)) return true;
  if (opts.valueIncludes?.some((s) => value.includes(s))) return true;
  if (opts.labelIncludes?.some((s) => label.includes(s))) return true;
  return false;
}

export function isArunBerkFaRoom(storedRoom: string, rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS): boolean {
  return roomMatches(storedRoom, rooms, {
    values: [ARUN_BERK_FA_ROOM],
    valueIncludes: ["อรุณเบิกฟ้า"],
    labelIncludes: ["อรุณเบิกฟ้า"],
  });
}

function isSaphaRoom(storedRoom: string, rooms: MeetingRoom[]): boolean {
  return roomMatches(storedRoom, rooms, {
    values: ["สภาฯ"],
    valueIncludes: ["สภาฯ"],
    labelIncludes: ["สภาฯ", "ห้องประชุมสภา"],
  });
}

function isKaoJomRoom(storedRoom: string, rooms: MeetingRoom[]): boolean {
  return roomMatches(storedRoom, rooms, {
    values: ["เก้าจอม"],
    labelIncludes: ["เก้าจอม"],
  });
}

function isRungArunRoom(storedRoom: string, rooms: MeetingRoom[]): boolean {
  return roomMatches(storedRoom, rooms, {
    values: ["รุ่งอรุณ"],
    labelIncludes: ["รุ่งอรุณ"],
  });
}

export function equipmentOptionsForRoom(
  storedRoom: string,
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
): string[] {
  if (!storedRoom.trim()) return [...EQUIPMENT_OPTIONS];
  if (isKaoJomRoom(storedRoom, rooms)) return [];

  const hidden = new Set<string>();
  if (isArunBerkFaRoom(storedRoom, rooms)) {
    EQUIPMENT_HIDDEN_FOR_ARUN_BERK_FA.forEach((item) => hidden.add(item));
  }
  if (isSaphaRoom(storedRoom, rooms)) {
    EQUIPMENT_HIDDEN_FOR_SAPHA.forEach((item) => hidden.add(item));
  }
  if (isRungArunRoom(storedRoom, rooms)) {
    EQUIPMENT_HIDDEN_FOR_RUNG_ARUN.forEach((item) => hidden.add(item));
  }

  if (hidden.size === 0) return [...EQUIPMENT_OPTIONS];
  return EQUIPMENT_OPTIONS.filter((item) => !hidden.has(item));
}

export function filterEquipmentForRoom(
  storedRoom: string,
  selected: string[],
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
): string[] {
  const allowed = new Set(equipmentOptionsForRoom(storedRoom, rooms));
  return selected.filter((item) => allowed.has(item));
}

export function reservationUsesVcs(r: { equipment?: unknown }): boolean {
  if (!Array.isArray(r.equipment)) return false;
  return r.equipment.some(
    (item) => item === VCS_EQUIPMENT_LABEL || String(item).includes("VCS"),
  );
}

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
