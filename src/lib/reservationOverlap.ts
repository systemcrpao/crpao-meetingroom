import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { formatDateThaiLongBE } from "@/lib/thaiDate";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && a1 > b0;
}

export async function findReservationOverlap(
  room: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  excludeIds: string[] = [],
): Promise<{ id: string; startTime: string; endTime: string } | null> {
  const exclude = new Set(excludeIds);
  const snap = await getDocs(
    query(
      collection(db, "reservations"),
      where("room", "==", room),
      where("date", "==", dateStr),
      where("status", "in", ["pending", "approved"]),
    ),
  );

  for (const d of snap.docs) {
    if (exclude.has(d.id)) continue;
    const r = d.data();
    if (timesOverlap(startTime, endTime, String(r.startTime ?? ""), String(r.endTime ?? ""))) {
      return {
        id: d.id,
        startTime: String(r.startTime ?? ""),
        endTime: String(r.endTime ?? ""),
      };
    }
  }
  return null;
}

export function overlapErrorMessage(
  room: string,
  dateStr: string,
  conflict?: { startTime: string; endTime: string } | null,
): string {
  const when = formatDateThaiLongBE(dateStr);
  if (conflict) {
    return `ไม่สามารถแก้ไขได้ เนื่องจากมีการจองห้อง ${room} ในวันที่ ${when} ช่วงเวลา ${conflict.startTime}–${conflict.endTime} น. แล้ว`;
  }
  return `ไม่สามารถแก้ไขได้ เนื่องจากมีการจองห้อง ${room} ในวันที่ ${when} ในช่วงเวลานี้แล้ว`;
}
