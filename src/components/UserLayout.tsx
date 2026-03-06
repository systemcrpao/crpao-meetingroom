import { Link, useNavigate } from "react-router-dom";
import { LogIn, CalendarDays, LogOut, ShieldCheck, FileSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 flex items-center justify-between border-b bg-card px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">ระบบจองห้องประชุม</span>
          <span className="hidden md:inline text-xs text-muted-foreground ml-1">
            องค์การบริหารส่วนจังหวัดเชียงราย
          </span>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>{user.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">แผงผู้ดูแล</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-muted-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/login">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>เข้าสู่ระบบผู้ดูแล</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/tracking">
                  <FileSearch className="h-3.5 w-3.5" />
                  <span>ติดตาม</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
