import { DEFAULT_MEETING_ROOMS, resolveRoom } from "@/lib/meetingRooms";

export type AdminRole = "super_admin" | "admin";

export interface AdminUserDoc {
  email: string;
  role: AdminRole;
  /** ค่า value ของห้องใน ROOMS — ใช้กับ admin เท่านั้น */
  allowedRooms: string[];
}

export interface AdminProfile {
  email: string;
  role: AdminRole;
  allowedRooms: string[];
  isAdmin: true;
  isSuperAdmin: boolean;
  /** มาจาก Firestore หรือ bootstrap จาก env */
  source: "firestore" | "bootstrap";
}

export function adminDocId(email: string): string {
  return email.trim().toLowerCase();
}

/** แยกรายการอีเมลจาก env / Firestore (รองรับ comma, semicolon, ขึ้นบรรทัด) */
export function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function parseSuperAdminEmails(): Set<string> {
  const raw = import.meta.env.VITE_SUPER_ADMIN_EMAILS ?? "";
  return new Set(parseEmailList(raw));
}

export const APP_CONFIG_COLLECTION = "appConfig";
export const APP_ACCESS_DOC_ID = "access";

export interface AppAccessConfig {
  /** Super Admin เพิ่มจากแผงผู้ดูthen — ไม่ต้อง rebuild เว็บ */
  superAdminEmails?: string[];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSuperAdminEmail(
  email: string | null | undefined,
  remoteSuperAdminEmails: string[] = [],
): boolean {
  if (!email) return false;
  const key = normalizeEmail(email);
  if (parseSuperAdminEmails().has(key)) return true;
  return remoteSuperAdminEmails.some((e) => normalizeEmail(e) === key);
}

export function isBootstrapSuperAdmin(
  email: string | null | undefined,
  remoteSuperAdminEmails: string[] = [],
): boolean {
  return isSuperAdminEmail(email, remoteSuperAdminEmails);
}

export function allRoomValues(rooms = DEFAULT_MEETING_ROOMS): string[] {
  return rooms.filter((r) => r.enabled).map((r) => r.value);
}

export function canApproveRoom(profile: AdminProfile | null, storedRoom: string): boolean {
  if (!profile?.isAdmin) return false;
  if (profile.isSuperAdmin) return true;
  const key = resolveRoom(storedRoom);
  return profile.allowedRooms.includes(key);
}

export function adminProfileFromDoc(email: string, data: AdminUserDoc): AdminProfile | null {
  if (data.role === "super_admin") {
    return {
      email: data.email || email,
      role: "super_admin",
      allowedRooms: allRoomValues(DEFAULT_MEETING_ROOMS),
      isAdmin: true,
      isSuperAdmin: true,
      source: "firestore",
    };
  }
  if (data.role === "admin") {
    return {
      email: data.email || email,
      role: "admin",
      allowedRooms: Array.isArray(data.allowedRooms) ? data.allowedRooms : [],
      isAdmin: true,
      isSuperAdmin: false,
      source: "firestore",
    };
  }
  return null;
}

export function bootstrapSuperAdminProfile(email: string): AdminProfile {
  return {
    email,
    role: "super_admin",
    allowedRooms: allRoomValues(),
    isAdmin: true,
    isSuperAdmin: true,
    source: "bootstrap",
  };
}
