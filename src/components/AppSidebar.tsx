import {
  CalendarDays,
  ClipboardEdit,
  LayoutDashboard,
  ListChecks,
  BarChart3,
  FileSearch,
  Shield,
  DoorOpen,
  Printer,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAdminProfile } from "@/contexts/AdminProfileContext";

const bookingNavItems = [
  { title: "จองห้องประชุม", url: "/", icon: ClipboardEdit },
  { title: "ติดตามสถานะการจอง", url: "/tracking", icon: FileSearch },
];

const adminToolNavItems = [
  { title: "แดชบอร์ดสำหรับอนุมัติ", url: "/admin", icon: LayoutDashboard },
  { title: "จัดการการจอง", url: "/admin/manage", icon: ListChecks },
  { title: "รายงานการจองห้องประชุม", url: "/admin/reports", icon: BarChart3 },
  { title: "พิมพ์เอกสาร", url: "/admin/print", icon: Printer },
];

const superAdminNavItems = [
  { title: "จัดการห้องประชุม", url: "/admin/rooms", icon: DoorOpen },
  { title: "กำหนดสิทธิ์ Admin", url: "/admin/permissions", icon: Shield },
];

export function AppSidebar() {
  const { profile } = useAdminProfile();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">ระบบจองห้องประชุม</span>
            <span className="text-xs text-sidebar-foreground/60">Meeting Room Reservation</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-sidebar-foreground/70">
            การจองห้องประชุม
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bookingNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-3 mx-3" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-sidebar-foreground/70">
            เครื่องมือผู้ดูแลระบบ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminToolNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.isSuperAdmin && (
          <>
            <SidebarSeparator className="my-3 mx-3" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wide text-sidebar-foreground/70">
                ระดับ Super Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {superAdminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
