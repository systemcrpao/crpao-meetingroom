import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminProfileProvider, useAdminProfile } from "@/contexts/AdminProfileContext";
import { MeetingRoomsProvider } from "@/contexts/MeetingRoomsContext";
import AdminManageRooms from "@/pages/AdminManageRooms";
import AdminPrintDocuments from "@/pages/AdminPrintDocuments";
import { AppLayout } from "@/components/AppLayout";
import { UserLayout } from "@/components/UserLayout";
import PublicPage from "@/pages/PublicPage";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ManageReservations from "@/pages/ManageReservations";
import ReportDashboard from "@/pages/ReportDashboard";
import AdminPermissions from "@/pages/AdminPermissions";
import TrackingPage from "@/pages/TrackingPage";
import RequestEditBookingPage from "@/pages/RequestEditBookingPage";
import NotFound from "./pages/NotFound";

/** รองรับ GitHub Pages (subpath) ผ่าน Vite `base` */
const routerBasename =
  import.meta.env.BASE_URL !== "/"
    ? import.meta.env.BASE_URL.replace(/\/$/, "")
    : undefined;

// เส้นทางที่ต้องล็อกอินก่อน — redirect ไป login ถ้ายังไม่มี session
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAdminProfile();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!profile?.isAdmin) {
    return <Navigate to="/login" replace state={{ adminDenied: true }} />;
  }
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAdminProfile();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!profile?.isSuperAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useAdminProfile();

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (user && profile?.isAdmin) return <Navigate to="/admin" replace />;
  return <LoginPage />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <Routes>
      {/* Public routes — ไม่ต้อง login */}
      <Route
        path="/"
        element={
          <UserLayout>
            <PublicPage />
          </UserLayout>
        }
      />
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/tracking"
        element={
          <UserLayout>
            <TrackingPage />
          </UserLayout>
        }
      />
      <Route
        path="/tracking/:code/edit"
        element={
          <UserLayout>
            <RequestEditBookingPage />
          </UserLayout>
        }
      />

      {/* Admin routes — ต้อง login */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/manage"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppLayout>
                <ManageReservations />
              </AppLayout>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppLayout>
                <ReportDashboard />
              </AppLayout>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/print"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppLayout>
                <AdminPrintDocuments />
              </AppLayout>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/permissions"
        element={
          <RequireAuth>
            <RequireAdmin>
              <RequireSuperAdmin>
                <AppLayout>
                  <AdminPermissions />
                </AppLayout>
              </RequireSuperAdmin>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/rooms"
        element={
          <RequireAuth>
            <RequireAdmin>
              <RequireSuperAdmin>
                <AppLayout>
                  <AdminManageRooms />
                </AppLayout>
              </RequireSuperAdmin>
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function FirebaseConfigNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted">
      <div className="max-w-md text-center space-y-2 text-sm">
        <p className="font-semibold text-destructive">ยังไม่ได้ตั้งค่า Firebase ตอน build</p>
        <p className="text-muted-foreground">
          ตั้ง GitHub Actions Secrets ชื่อ <code className="text-xs">VITE_FIREBASE_*</code> ตาม{" "}
          <code className="text-xs">.env.example</code> แล้ว deploy ใหม่
        </p>
      </div>
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="meeting-room-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBasename}>
      {!import.meta.env.VITE_FIREBASE_API_KEY ? (
        <FirebaseConfigNotice />
      ) : (
        <AuthProvider>
          <MeetingRoomsProvider>
            <AdminProfileProvider>
              <AppRoutes />
            </AdminProfileProvider>
          </MeetingRoomsProvider>
        </AuthProvider>
      )}
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
