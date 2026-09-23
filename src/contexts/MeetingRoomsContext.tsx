import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_MEETING_ROOMS,
  MEETING_ROOMS_COLLECTION,
  docToMeetingRoom,
  sortMeetingRooms,
  type MeetingRoom,
  type MeetingRoomDoc,
} from "@/lib/meetingRooms";

interface MeetingRoomsContextType {
  /** ห้องทั้งหมด (รวมที่ปิดใช้งาน) */
  allRooms: MeetingRoom[];
  /** ห้องที่เปิดให้จอง — ใช้ในฟอร์มและตัวกรอง */
  activeRooms: MeetingRoom[];
  loading: boolean;
  /** มีเอกสารใน Firestore แล้ว */
  fromFirestore: boolean;
}

const MeetingRoomsContext = createContext<MeetingRoomsContextType>({
  allRooms: DEFAULT_MEETING_ROOMS,
  activeRooms: DEFAULT_MEETING_ROOMS,
  loading: true,
  fromFirestore: false,
});

export function MeetingRoomsProvider({ children }: { children: React.ReactNode }) {
  const [firestoreRooms, setFirestoreRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, MEETING_ROOMS_COLLECTION),
      (snap) => {
        const list = snap.docs.map((d) =>
          docToMeetingRoom(d.id, d.data() as MeetingRoomDoc),
        );
        setFirestoreRooms(sortMeetingRooms(list));
        setLoading(false);
      },
      () => {
        setFirestoreRooms([]);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const fromFirestore = firestoreRooms.length > 0;

  const allRooms = useMemo(
    () => (fromFirestore ? firestoreRooms : DEFAULT_MEETING_ROOMS),
    [fromFirestore, firestoreRooms],
  );

  const activeRooms = useMemo(
    () => sortMeetingRooms(allRooms.filter((r) => r.enabled)),
    [allRooms],
  );

  return (
    <MeetingRoomsContext.Provider value={{ allRooms, activeRooms, loading, fromFirestore }}>
      {children}
    </MeetingRoomsContext.Provider>
  );
}

export const useMeetingRooms = () => useContext(MeetingRoomsContext);
