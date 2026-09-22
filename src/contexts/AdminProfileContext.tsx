import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AdminProfile,
  type AdminUserDoc,
  adminDocId,
  adminProfileFromDoc,
  bootstrapSuperAdminProfile,
  isBootstrapSuperAdmin,
} from "@/lib/adminAccess";

interface AdminProfileContextType {
  profile: AdminProfile | null;
  loading: boolean;
}

const AdminProfileContext = createContext<AdminProfileContextType>({
  profile: null,
  loading: true,
});

export function AdminProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [firestoreProfile, setFirestoreProfile] = useState<AdminProfile | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setFirestoreProfile(null);
      setDocLoading(false);
      return;
    }

    setDocLoading(true);
    const ref = doc(db, "adminUsers", adminDocId(user.email));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setFirestoreProfile(adminProfileFromDoc(user.email!, snap.data() as AdminUserDoc));
        } else {
          setFirestoreProfile(null);
        }
        setDocLoading(false);
      },
      () => {
        setFirestoreProfile(null);
        setDocLoading(false);
      },
    );
    return () => unsub();
  }, [user?.email]);

  const profile = useMemo((): AdminProfile | null => {
    if (!user?.email) return null;
    if (firestoreProfile) return firestoreProfile;
    if (isBootstrapSuperAdmin(user.email)) return bootstrapSuperAdminProfile(user.email);
    return null;
  }, [user?.email, firestoreProfile]);

  const loading = authLoading || (!!user?.email && docLoading);

  return (
    <AdminProfileContext.Provider value={{ profile, loading }}>
      {children}
    </AdminProfileContext.Provider>
  );
}

export const useAdminProfile = () => useContext(AdminProfileContext);
