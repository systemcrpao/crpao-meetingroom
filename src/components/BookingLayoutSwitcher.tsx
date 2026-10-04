import { CalendarDays, ClipboardEdit, LayoutPanelLeft } from "lucide-react";
import { useBookingPageLayout, type BookingPageLayout } from "@/contexts/BookingPageLayoutContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS: { id: BookingPageLayout; label: string; short: string; icon: typeof LayoutPanelLeft }[] = [
  { id: "both", label: "ทั้งคู่", short: "คู่", icon: LayoutPanelLeft },
  { id: "calendar", label: "ปฏิทิน", short: "ปฏิทิน", icon: CalendarDays },
  { id: "form", label: "แบบฟอร์ม", short: "ฟอร์ม", icon: ClipboardEdit },
];

export function BookingLayoutSwitcher({ className }: { className?: string }) {
  const { pageLayout, setPageLayout } = useBookingPageLayout();

  return (
    <div
      className={cn("flex flex-col items-center gap-1 w-full max-w-md mx-auto", className)}
      role="group"
      aria-label="มุมมองหน้าจอง"
    >

      <div className="flex rounded-lg border bg-background overflow-hidden w-full shadow-sm">
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          const active = pageLayout === opt.id;
          return (
            <Button
              key={opt.id}
              type="button"
              variant={active ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-none h-8 sm:h-9 flex-1 min-w-0 px-1.5 sm:px-2.5 text-[11px] sm:text-xs gap-1",
                i > 0 && "border-l",
              )}
              onClick={() => setPageLayout(opt.id)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate hidden min-[380px]:inline">{opt.label}</span>
              <span className="truncate min-[380px]:hidden">{opt.short}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
