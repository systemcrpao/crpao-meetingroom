/** แมปชื่อห้องเก่าใน Firestore → ชื่อปัจจุบัน */
export function resolveRoom(room: string): string {
  if (room === "นครธรรม") return "รุ่งอรุณ";
  return room;
}

export const MEETING_ROOMS_COLLECTION = "meetingRooms";

export type RoomColorKey =
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "red"
  | "teal"
  | "pink"
  | "amber"
  | "cyan"
  | "slate";

export interface MeetingRoom {
  id: string;
  value: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  colorKey: RoomColorKey;
}

export interface MeetingRoomDoc {
  value: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  colorKey: RoomColorKey;
}

export const ROOM_COLOR_KEYS: RoomColorKey[] = [
  "green",
  "blue",
  "purple",
  "orange",
  "red",
  "teal",
  "pink",
  "amber",
  "cyan",
  "slate",
];

export function normalizeRoomColorKey(key: unknown): RoomColorKey {
  if (typeof key === "string" && (ROOM_COLOR_KEYS as string[]).includes(key)) {
    return key as RoomColorKey;
  }
  return "slate";
}

export const ROOM_COLOR_OPTIONS: { key: RoomColorKey; label: string }[] = [
  { key: "green", label: "เขียว" },
  { key: "blue", label: "น้ำเงิน" },
  { key: "purple", label: "ม่วง" },
  { key: "orange", label: "ส้ม" },
  { key: "red", label: "แดง" },
  { key: "teal", label: "เขียวน้ำทะเล" },
  { key: "pink", label: "ชมพู" },
  { key: "amber", label: "เหลือง" },
  { key: "cyan", label: "ฟ้า" },
  { key: "slate", label: "เทา" },
];

const COLOR_SOLID: Record<RoomColorKey, string> = {
  green: "bg-[hsl(var(--room-green))]",
  blue: "bg-[hsl(var(--room-blue))]",
  purple: "bg-[hsl(var(--room-purple))]",
  orange: "bg-[hsl(var(--room-orange))]",
  red: "bg-[hsl(var(--room-red))]",
  teal: "bg-[hsl(var(--room-teal))]",
  pink: "bg-[hsl(var(--room-pink))]",
  amber: "bg-[hsl(var(--room-amber))]",
  cyan: "bg-[hsl(var(--room-cyan))]",
  slate: "bg-[hsl(var(--room-slate))]",
};

const COLOR_LIGHT: Record<RoomColorKey, string> = {
  green:
    "bg-[hsl(var(--room-green)/0.15)] text-[hsl(var(--room-green))] border-[hsl(var(--room-green)/0.3)]",
  blue: "bg-[hsl(var(--room-blue)/0.15)] text-[hsl(var(--room-blue))] border-[hsl(var(--room-blue)/0.3)]",
  purple:
    "bg-[hsl(var(--room-purple)/0.15)] text-[hsl(var(--room-purple))] border-[hsl(var(--room-purple)/0.3)]",
  orange:
    "bg-[hsl(var(--room-orange)/0.15)] text-[hsl(var(--room-orange))] border-[hsl(var(--room-orange)/0.3)]",
  red: "bg-[hsl(var(--room-red)/0.15)] text-[hsl(var(--room-red))] border-[hsl(var(--room-red)/0.3)]",
  teal: "bg-[hsl(var(--room-teal)/0.15)] text-[hsl(var(--room-teal))] border-[hsl(var(--room-teal)/0.3)]",
  pink: "bg-[hsl(var(--room-pink)/0.15)] text-[hsl(var(--room-pink))] border-[hsl(var(--room-pink)/0.3)]",
  amber:
    "bg-[hsl(var(--room-amber)/0.15)] text-[hsl(var(--room-amber))] border-[hsl(var(--room-amber)/0.3)]",
  cyan: "bg-[hsl(var(--room-cyan)/0.15)] text-[hsl(var(--room-cyan))] border-[hsl(var(--room-cyan)/0.3)]",
  slate:
    "bg-[hsl(var(--room-slate)/0.15)] text-[hsl(var(--room-slate))] border-[hsl(var(--room-slate)/0.3)]",
};

/** ค่าเริ่มต้นเมื่อยังไม่มีข้อมูลใน Firestore */
export const DEFAULT_MEETING_ROOMS: MeetingRoom[] = [
  {
    id: "ธรรมปัญญา",
    value: "ธรรมปัญญา",
    label: "ห้องประชุมธรรมปัญญา (180-200 คน)",
    enabled: true,
    sortOrder: 0,
    colorKey: "green",
  },
  {
    id: "ธรรมรับอรุณ",
    value: "ธรรมรับอรุณ",
    label: "ห้องประชุมธรรมรับอรุณ (40-50 คน)",
    enabled: true,
    sortOrder: 1,
    colorKey: "blue",
  },
  {
    id: "ยอแสงธรรม",
    value: "ยอแสงธรรม",
    label: "ห้องประชุมยอแสงธรรม (40-50 คน)",
    enabled: true,
    sortOrder: 2,
    colorKey: "purple",
  },
  {
    id: "รุ่งอรุณ",
    value: "รุ่งอรุณ",
    label: "ห้องประชุมรุ่งอรุณ (5-20 คน)",
    enabled: true,
    sortOrder: 3,
    colorKey: "red",
  },
  {
    id: "เก้าจอม",
    value: "เก้าจอม",
    label: "ห้องเก้าจอม (ห้องรับรองแขก VIP)",
    enabled: true,
    sortOrder: 4,
    colorKey: "orange",
  },
];

export function meetingRoomDocId(value: string): string {
  return value.trim();
}

export function findMeetingRoom(
  storedRoom: string,
  rooms: MeetingRoom[],
): MeetingRoom | undefined {
  const key = resolveRoom(storedRoom);
  const trimmed = key.trim();
  return rooms.find(
    (r) =>
      r.value === key ||
      r.id === key ||
      r.value === trimmed ||
      r.label === key ||
      r.label === trimmed,
  );
}

export function getRoomLabelFromList(room: string, rooms: MeetingRoom[]): string {
  return findMeetingRoom(room, rooms)?.label ?? room;
}

export function roomColorClassFromList(
  room: string,
  rooms: MeetingRoom[],
  light = false,
): string {
  const def = findMeetingRoom(room, rooms);
  const key = normalizeRoomColorKey(def?.colorKey);
  return light ? COLOR_LIGHT[key] : COLOR_SOLID[key];
}

export function roomSolidColorClass(colorKey: RoomColorKey | string): string {
  return COLOR_SOLID[normalizeRoomColorKey(colorKey)];
}

export function roomLightColorClass(colorKey: RoomColorKey | string): string {
  return COLOR_LIGHT[normalizeRoomColorKey(colorKey)];
}

export function roomMatchesFilterWithList(
  storedRoom: string,
  filter: string,
  rooms: MeetingRoom[],
): boolean {
  if (filter === "all") return true;
  return resolveRoom(storedRoom) === filter;
}

export function docToMeetingRoom(id: string, data: MeetingRoomDoc): MeetingRoom {
  return {
    id,
    value: data.value || id,
    label: data.label || data.value || id,
    enabled: data.enabled !== false,
    sortOrder: Number(data.sortOrder ?? 0),
    colorKey: normalizeRoomColorKey(data.colorKey),
  };
}

export function sortMeetingRooms(list: MeetingRoom[]): MeetingRoom[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "th"));
}
