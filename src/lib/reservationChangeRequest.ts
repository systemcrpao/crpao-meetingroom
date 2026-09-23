import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { format } from "date-fns";
import { findReservationOverlap, overlapErrorMessage, timeToMinutes } from "@/lib/reservationOverlap";

export type ChangeRequestType = "edit" | "cancel";

export interface ChangeRequest {
  type: ChangeRequestType;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export type ReservationByTracking = {
  id: string;
  date?: string;
  room?: string;
  status?: string;
  trackingNumber?: string;
  changeRequest?: ChangeRequest;
  [key: string]: unknown;
};

export async function fetchReservationsByTracking(
  trackingNumber: string,
): Promise<ReservationByTracking[]> {
  const code = trackingNumber.trim().toUpperCase();
  const snap = await getDocs(
    query(collection(db, "reservations"), where("trackingNumber", "==", code)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ReservationByTracking)
    .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
}

export function hasPendingChangeRequest(row: { changeRequest?: ChangeRequest | null }): boolean {
  return !!row.changeRequest?.type;
}

export async function submitEditChangeRequest(
  reservationId: string,
  room: string,
  payload: { date: Date; startTime: string; endTime: string },
): Promise<void> {
  const start = timeToMinutes(payload.startTime);
  const end = timeToMinutes(payload.endTime);
  if (end <= start) {
    throw new Error("เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น");
  }

  const dateStr = format(payload.date, "yyyy-MM-dd");
  const conflict = await findReservationOverlap(
    room,
    dateStr,
    payload.startTime,
    payload.endTime,
    [reservationId],
  );
  if (conflict) {
    throw new Error(overlapErrorMessage(room, dateStr, conflict));
  }

  await updateDoc(doc(db, "reservations", reservationId), {
    changeRequest: {
      type: "edit",
      date: dateStr,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
    changeRequestedAt: serverTimestamp(),
  });
}

export async function submitCancelChangeRequest(trackingNumber: string): Promise<void> {
  const rows = await fetchReservationsByTracking(trackingNumber);
  if (rows.length === 0) throw new Error("ไม่พบรายการจอง");

  const batch = writeBatch(db);
  for (const row of rows) {
    batch.update(doc(db, "reservations", row.id), {
      changeRequest: { type: "cancel" },
      changeRequestedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function clearChangeRequest(reservationId: string): Promise<void> {
  await updateDoc(doc(db, "reservations", reservationId), {
    changeRequest: deleteField(),
    changeRequestedAt: deleteField(),
  });
}

export async function clearChangeRequestByTracking(trackingNumber: string): Promise<void> {
  const rows = await fetchReservationsByTracking(trackingNumber);
  const batch = writeBatch(db);
  for (const row of rows) {
    batch.update(doc(db, "reservations", row.id), {
      changeRequest: deleteField(),
      changeRequestedAt: deleteField(),
    });
  }
  await batch.commit();
}

export async function approveEditChangeRequest(reservationId: string, room: string): Promise<void> {
  const ref = doc(db, "reservations", reservationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบรายการจอง");

  const data = snap.data();
  const cr = data.changeRequest as ChangeRequest | undefined;
  if (cr?.type !== "edit" || !cr.date || !cr.startTime || !cr.endTime) {
    throw new Error("ไม่พบคำขอแก้ไขวัน/เวลา");
  }

  const conflict = await findReservationOverlap(
    room,
    cr.date,
    cr.startTime,
    cr.endTime,
    [reservationId],
  );
  if (conflict) {
    throw new Error(overlapErrorMessage(room, cr.date, conflict));
  }

  await updateDoc(ref, {
    date: cr.date,
    startTime: cr.startTime,
    endTime: cr.endTime,
    changeRequest: deleteField(),
    changeRequestedAt: deleteField(),
  });
}

export async function approveCancelChangeRequest(trackingNumber: string): Promise<void> {
  const code = trackingNumber.trim().toUpperCase();
  const rows = await fetchReservationsByTracking(code);
  if (rows.length === 0) throw new Error("ไม่พบรายการจอง");

  const batch = writeBatch(db);
  for (const row of rows) {
    batch.delete(doc(db, "reservations", row.id));
  }
  await batch.commit();
}

export async function rejectChangeRequest(
  reservation: { id: string; trackingNumber?: string; changeRequest?: ChangeRequest },
): Promise<void> {
  if (reservation.changeRequest?.type === "cancel" && reservation.trackingNumber) {
    await clearChangeRequestByTracking(reservation.trackingNumber);
    return;
  }
  await clearChangeRequest(reservation.id);
}
