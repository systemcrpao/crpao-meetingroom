import { ROOMS, resolveRoom } from "@/lib/mockData";

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

export function parseSuperAdminEmails(): Set<string> {
  const raw = import.meta.env.VITE_SUPER_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isBootstrapSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseSuperAdminEmails().has(email.trim().toLowerCase());
}

export function allRoomValues(): string[] {
  return ROOMS.map((r) => r.value);
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
      allowedRooms: allRoomValues(),
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
