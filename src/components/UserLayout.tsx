import { Link, useNavigate } from "react-router-dom";
import { LogIn, CalendarDays, LogOut, ShieldCheck, FileSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <header className="min-h-14 h-auto py-2 flex items-center justify-between gap-2 border-b bg-card px-3 sm:px-4 md:px-6 shadow-sm">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="h-4 w-4" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-tight truncate">ระบบจองห้องประชุม</span>
          <span className="hidden md:inline text-xs text-muted-foreground ml-1">
            องค์การบริหารส่วนจังหวัดเชียงราย
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <ThemeToggle />
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
              <Button asChild variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3">
                <Link to="/login" title="เข้าสู่ระบบผู้ดูแล">
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">เข้าสู่ระบบผู้ดูแล</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3">
                <Link to="/tracking" title="ติดตามสถานะ">
                  <FileSearch className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ติดตาม</span>
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
