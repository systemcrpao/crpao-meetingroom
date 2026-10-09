import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, CalendarDays, LogOut, ShieldCheck, FileSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookingPageLayoutProvider } from "@/contexts/BookingPageLayoutContext";
import { BookingLayoutSwitcher } from "@/components/BookingLayoutSwitcher";
import { ContactSupportDialog } from "@/components/ContactSupportDialog";

function isBookingHomePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  return p === "/";
}

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showLayoutSwitcher = isBookingHomePath(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const actionButtons = (
    <>
      <ThemeToggle />
      {user ? (
        <>
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground max-w-[140px] lg:max-w-none truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-1.5 px-2 lg:px-3 h-8"
            title="แผงผู้ดูแล"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">แผงผู้ดูแล</span>
          </Button>
          <ContactSupportDialog compactUntil="lg" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-muted-foreground px-2 h-8"
            title="ออกจากระบบ"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">ออกจากระบบ</span>
          </Button>
        </>
      ) : (
        <>
          <Button asChild variant="outline" size="sm" className="gap-1.5 px-2 lg:px-3 h-8">
            <Link to="/login" title="เข้าสู่ระบบผู้ดูแล">
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">เข้าสู่ระบบ</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 px-2 lg:px-3 h-8">
            <Link to="/tracking" title="ติดตามสถานะ">
              <FileSearch className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">ติดตาม</span>
            </Link>
          </Button>
          <ContactSupportDialog compactUntil="lg" />
        </>
      )}
    </>
  );

  const brandLink = (
    <Link
      to="/"
      className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="min-w-0 leading-tight">
        <span className="font-bold text-xs sm:text-sm tracking-tight block truncate">
          ระบบจองห้องประชุม
        </span>
        <span className="hidden sm:block text-[10px] text-muted-foreground truncate">
          องค์การบริหารส่วนจังหวัดเชียงราย
        </span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="px-3 sm:px-4 md:px-6 py-2">
          {showLayoutSwitcher ? (
            <>
              {/* มือถือ / แท็บเล็ต (รวม iPad mini) — เรียงเป็นชั้น ไม่ให้ปุ่มซ้อน */}
              <div className="flex flex-col gap-2.5 lg:hidden">
                {brandLink}
                <BookingLayoutSwitcher />
                <div className="flex flex-wrap items-center justify-end gap-1.5">{actionButtons}</div>
              </div>

              {/* จอ PC กว้าง */}
              <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)] items-center gap-x-4">
                <div className="justify-self-start min-w-0">{brandLink}</div>
                <div className="justify-self-center w-full max-w-md">
                  <BookingLayoutSwitcher />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-self-end justify-end">
                  {actionButtons}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 min-h-9">
              <div className="min-w-0">{brandLink}</div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                {actionButtons}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingPageLayoutProvider>
      <UserLayoutInner>{children}</UserLayoutInner>
    </BookingPageLayoutProvider>
  );
}
