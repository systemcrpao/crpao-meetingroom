import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminProfile } from "@/contexts/AdminProfileContext";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { profile } = useAdminProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 gap-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold text-foreground">
                ระบบจองห้องประชุม — ผู้ดูแล
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user && (
                <span className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {user.email}
                  {profile?.isSuperAdmin && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Super Admin
                    </Badge>
                  )}
                  {profile?.role === "admin" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Admin
                    </Badge>
                  )}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-muted-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
