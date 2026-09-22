import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { UserLayout } from "@/components/UserLayout";
import PublicPage from "@/pages/PublicPage";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ManageReservations from "@/pages/ManageReservations";
import ReportDashboard from "@/pages/ReportDashboard";
import TrackingPage from "@/pages/TrackingPage";
import NotFound from "./pages/NotFound";

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
      <Route
        path="/login"
        element={
          user ? <Navigate to="/admin" replace /> : <LoginPage />
        }
      />
      <Route
        path="/tracking"
        element={
          <UserLayout>
            <TrackingPage />
          </UserLayout>
        }
      />

      {/* Admin routes — ต้อง login */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/manage"
        element={
          <RequireAuth>
            <AppLayout>
              <ManageReservations />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RequireAuth>
            <AppLayout>
              <ReportDashboard />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
