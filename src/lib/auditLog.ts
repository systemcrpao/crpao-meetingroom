import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

export const AUDIT_LOGS_COLLECTION = "auditLogs";

export const AUDIT_LOG_PREVIEW_LIMIT = 60;

export type AuditLogAction =
  | "reservation_approve"
  | "reservation_reject"
  | "reservation_delete"
  | "reservation_edit"
  | "change_approve_cancel"
  | "change_reject_cancel"
  | "change_approve_edit"
  | "change_reject_edit";

export const AUDIT_LOG_ACTION_LABELS: Record<AuditLogAction, string> = {
  reservation_approve: "อนุมัติการจอง",
  reservation_reject: "ปฏิเสธและลบการจอง",
  reservation_delete: "ลบการจอง",
  reservation_edit: "แก้ไขการจอง",
  change_approve_cancel: "อนุมัติคำขอยกเลิก",
  change_reject_cancel: "ไม่อนุมัติคำขอยกเลิก",
  change_approve_edit: "อนุมัติคำขอแก้ไข",
  change_reject_edit: "ไม่อนุมัติคำขอแก้ไข",
};

export interface AuditLogDoc {
  id: string;
  action: AuditLogAction;
  actionLabel: string;
  targetType: "reservation";
  targetId: string;
  trackingNumber?: string | null;
  actorEmail: string;
  actorName?: string | null;
  summary?: string | null;
  createdAt?: Timestamp | null;
}

export type AuditActor = {
  email: string;
  displayName?: string | null;
};

export async function writeAuditLog(input: {
  action: AuditLogAction;
  targetId: string;
  trackingNumber?: string;
  summary?: string;
  actor: AuditActor;
}): Promise<void> {
  const email = input.actor.email.trim().toLowerCase();
  if (!email) return;

  try {
    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
      action: input.action,
      actionLabel: AUDIT_LOG_ACTION_LABELS[input.action],
      targetType: "reservation",
      targetId: input.targetId,
      trackingNumber: input.trackingNumber?.trim() || null,
      actorEmail: email,
      actorName: input.actor.displayName?.trim() || null,
      summary: input.summary?.trim() || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("writeAuditLog failed:", error);
  }
}

export function auditActorFromSession(
  user: { email?: string | null; displayName?: string | null } | null,
  profile?: { displayName?: string | null; email?: string | null } | null,
): AuditActor | null {
  const email = user?.email?.trim();
  if (!email) return null;
  const name =
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    email.split("@")[0];
  return { email, displayName: name };
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const d = value.toDate() as Date;
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function serializeAuditLogRow(id: string, data: Record<string, unknown>): Record<string, unknown> {
  return {
    id,
    ...data,
    createdAt: timestampToIso(data.createdAt) ?? data.createdAt ?? null,
  };
}

export async function fetchAuditLogsPreview(max = AUDIT_LOG_PREVIEW_LIMIT): Promise<AuditLogDoc[]> {
  const q = query(
    collection(db, AUDIT_LOGS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogDoc);
}

export async function fetchAllAuditLogsForBackup(): Promise<Record<string, unknown>[]> {
  const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeAuditLogRow(d.id, d.data() as Record<string, unknown>));
}

export async function clearAllAuditLogs(): Promise<number> {
  const snap = await getDocs(collection(db, AUDIT_LOGS_COLLECTION));
  let deleted = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, AUDIT_LOGS_COLLECTION, d.id));
    deleted++;
  }
  return deleted;
}

export function downloadAuditLogsBackup(rows: Record<string, unknown>[], filePrefix = "backup_audit_logs"): void {
  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
