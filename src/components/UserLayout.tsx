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
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground max-w-[140px] lg:max-w-none truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-1.5 px-2 sm:px-3"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">แผงผู้ดูแล</span>
          </Button>
          <ContactSupportDialog />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-muted-foreground px-2"
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
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3">
            <Link to="/tracking" title="ติดตามสถานะ">
              <FileSearch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ติดตาม</span>
            </Link>
          </Button>
          <ContactSupportDialog />
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="px-3 sm:px-4 md:px-6 py-2">
          {showLayoutSwitcher ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)] items-center gap-x-2 gap-y-2">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0 md:justify-self-start">
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

                <div className="hidden md:flex md:justify-self-center md:col-start-2 md:row-start-1 w-full max-w-md">
                  <BookingLayoutSwitcher />
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0 justify-end md:justify-self-end md:col-start-3">
                  {actionButtons}
                </div>
              </div>

              <div className="md:hidden">
                <BookingLayoutSwitcher />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 min-h-9">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs sm:text-sm tracking-tight truncate">ระบบจองห้องประชุม</span>
                <span className="hidden md:inline text-xs text-muted-foreground ml-1 truncate">
                  องค์การบริหารส่วนจังหวัดเชียงราย
                </span>
              </Link>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">{actionButtons}</div>
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
