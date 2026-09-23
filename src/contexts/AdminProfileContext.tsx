import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AdminProfile,
  type AdminUserDoc,
  type AppAccessConfig,
  APP_ACCESS_DOC_ID,
  APP_CONFIG_COLLECTION,
  adminDocId,
  adminProfileFromDoc,
  bootstrapSuperAdminProfile,
  isSuperAdminEmail,
  normalizeEmail,
} from "@/lib/adminAccess";

interface AdminProfileContextType {
  profile: AdminProfile | null;
  loading: boolean;
  /** รายชื่อ Super Admin จาก Firestore (สำหรับหน้ากำหนดสิทธิ์) */
  remoteSuperAdminEmails: string[];
}

const AdminProfileContext = createContext<AdminProfileContextType>({
  profile: null,
  loading: true,
  remoteSuperAdminEmails: [],
});

export function AdminProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [firestoreProfile, setFirestoreProfile] = useState<AdminProfile | null>(null);
  const [userDocLoading, setUserDocLoading] = useState(false);
  const [accessConfigLoading, setAccessConfigLoading] = useState(true);
  const [remoteSuperAdminEmails, setRemoteSuperAdminEmails] = useState<string[]>([]);

  useEffect(() => {
    const ref = doc(db, APP_CONFIG_COLLECTION, APP_ACCESS_DOC_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.exists() ? snap.data() : {}) as AppAccessConfig;
        const list = Array.isArray(data.superAdminEmails)
          ? data.superAdminEmails.map((e) => normalizeEmail(String(e))).filter(Boolean)
          : [];
        setRemoteSuperAdminEmails(list);
        setAccessConfigLoading(false);
      },
      () => {
        setRemoteSuperAdminEmails([]);
        setAccessConfigLoading(false);
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.email) {
      setFirestoreProfile(null);
      setUserDocLoading(false);
      return;
    }

    setUserDocLoading(true);
    const ref = doc(db, "adminUsers", adminDocId(user.email));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setFirestoreProfile(adminProfileFromDoc(user.email!, snap.data() as AdminUserDoc));
        } else {
          setFirestoreProfile(null);
        }
        setUserDocLoading(false);
      },
      () => {
        setFirestoreProfile(null);
        setUserDocLoading(false);
      },
    );
    return () => unsub();
  }, [user?.email]);

  const profile = useMemo((): AdminProfile | null => {
    if (!user?.email) return null;
    if (firestoreProfile) return firestoreProfile;
    if (isSuperAdminEmail(user.email, remoteSuperAdminEmails)) {
      return bootstrapSuperAdminProfile(user.email);
    }
    return null;
  }, [user?.email, firestoreProfile, remoteSuperAdminEmails]);

  const loading =
    authLoading ||
    accessConfigLoading ||
    (!!user?.email && userDocLoading);

  return (
    <AdminProfileContext.Provider value={{ profile, loading, remoteSuperAdminEmails }}>
      {children}
    </AdminProfileContext.Provider>
  );
}

export const useAdminProfile = () => useContext(AdminProfileContext);
