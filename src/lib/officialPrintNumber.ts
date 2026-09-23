import { db } from "@/lib/firebase";
import { APP_CONFIG_COLLECTION } from "@/lib/adminAccess";
import { toBuddhistYear } from "@/lib/thaiDate";
import { doc, runTransaction, Timestamp, type DocumentReference } from "firebase/firestore";

function counterRef(beYear: number) {
  return doc(db, APP_CONFIG_COLLECTION, `officialPrint_${beYear}`);
}

export function formatOfficialDocNumber(seq: number, beYear: number): string {
  return `${seq}/${beYear}`;
}

export function parseApprovedAt(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const sec = Number((value as { seconds: number }).seconds);
    if (!Number.isNaN(sec)) return new Date(sec * 1000);
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** อนุมัติพร้อมออกเลขที่เอกสาร (รันใน transaction) */
export async function approveReservationWithOfficialDoc(
  reservationId: string,
): Promise<{ officialDocNumber: string; approvedAt: Date }> {
  const approvedAt = new Date();
  const beYear = toBuddhistYear(approvedAt);
  const reservationRef = doc(db, "reservations", reservationId);
  const seqRef = counterRef(beYear);

  const seq = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(seqRef);
    const last = counterSnap.exists() ? Number(counterSnap.data().lastNumber ?? 0) : 0;
    const next = last + 1;
    tx.set(seqRef, { lastNumber: next, beYear }, { merge: true });
    tx.update(reservationRef, {
      status: "approved",
      approvedAt: Timestamp.fromDate(approvedAt),
      officialDocNumber: formatOfficialDocNumber(next, beYear),
      officialDocSeq: next,
      officialDocBeYear: beYear,
    });
    return next;
  });

  return {
    officialDocNumber: formatOfficialDocNumber(seq, beYear),
    approvedAt,
  };
}

/** รายการอนุมัติเก่าที่ยังไม่มีเลข — ออกเลขตอนพิมพ์ครั้งแรก */
export async function ensureOfficialDocMeta(reservation: {
  id: string;
  status?: string;
  officialDocNumber?: string;
  approvedAt?: unknown;
}): Promise<{ officialDocNumber: string; approvedAt: Date }> {
  const existingAt = parseApprovedAt(reservation.approvedAt);
  if (reservation.officialDocNumber && existingAt) {
    return { officialDocNumber: reservation.officialDocNumber, approvedAt: existingAt };
  }

  if (reservation.status !== "approved") {
    throw new Error("not_approved");
  }

  const approvedAt = existingAt ?? new Date();
  const beYear = toBuddhistYear(approvedAt);
  const reservationRef = doc(db, "reservations", reservation.id) as DocumentReference;
  const seqRef = counterRef(beYear);

  const result = await runTransaction(db, async (tx) => {
    const resSnap = await tx.get(reservationRef);
    const data = resSnap.data() ?? {};
    const storedNum = data.officialDocNumber as string | undefined;
    const storedAt = parseApprovedAt(data.approvedAt);
    if (storedNum && storedAt) {
      return { officialDocNumber: storedNum, approvedAt: storedAt };
    }

    const counterSnap = await tx.get(seqRef);
    const last = counterSnap.exists() ? Number(counterSnap.data().lastNumber ?? 0) : 0;
    const next = last + 1;
    const officialDocNumber = formatOfficialDocNumber(next, beYear);
    const at = storedAt ?? approvedAt;

    tx.set(seqRef, { lastNumber: next, beYear }, { merge: true });
    tx.update(reservationRef, {
      officialDocNumber,
      officialDocSeq: next,
      officialDocBeYear: beYear,
      approvedAt: data.approvedAt ?? Timestamp.fromDate(at),
      status: "approved",
    });

    return { officialDocNumber, approvedAt: at };
  });

  return result;
}
