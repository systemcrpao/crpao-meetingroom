import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  APP_ACCESS_DOC_ID,
  APP_CONFIG_COLLECTION,
  adminDocId,
  allRoomValues,
  isSuperAdminEmail,
  normalizeEmail,
} from "@/lib/adminAccess";

/**
 * สร้าง/อัปเดต adminUsers สำหรับ Super Admin จาก env หรือ appConfig
 * เพื่อให้ Firestore Rules รู้จักสิทธิ์เขียน (ประกาศ ห้อง ฯลฯ)
 */
export async function ensureSuperAdminFirestoreRecord(
  email: string,
  remoteSuperAdminEmails: string[],
): Promise<void> {
  const key = normalizeEmail(email);
  if (!isSuperAdminEmail(key, remoteSuperAdminEmails)) return;

  const adminRef = doc(db, "adminUsers", adminDocId(key));
  const existing = await getDoc(adminRef);
  if (existing.exists()) {
    const role = existing.data()?.role;
    if (role === "super_admin") return;
    // มี adminUsers เป็นบทบาท admin แล้ว — ห้ามยกระดับจาก client (ต้องให้ Super Admin จัดการในเมนูสิทธิ์)
    if (role === "admin") return;
  }

  await setDoc(adminRef, {
    email: key,
    role: "super_admin",
    allowedRooms: allRoomValues(),
    updatedAt: serverTimestamp(),
  });

  const listed = remoteSuperAdminEmails.map(normalizeEmail);
  if (listed.includes(key)) return;

  const accessRef = doc(db, APP_CONFIG_COLLECTION, APP_ACCESS_DOC_ID);
  const next = [...new Set([...listed, key])];
  await setDoc(
    accessRef,
    { superAdminEmails: next, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
