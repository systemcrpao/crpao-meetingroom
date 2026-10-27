import type { LucideIcon } from "lucide-react";
import { Cable, Mic, MonitorPlay, Presentation, Tv, Wifi } from "lucide-react";
import { EQUIPMENT_OPTIONS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type EquipmentIconConfig = {
  label: string;
  Icon: LucideIcon;
  iconClassName: string;
  ringClassName: string;
};

export const RESERVATION_EQUIPMENT_ICONS: EquipmentIconConfig[] = [
  {
    label: EQUIPMENT_OPTIONS[0],
    Icon: Mic,
    iconClassName: "text-violet-700",
    ringClassName: "bg-violet-100 border-violet-200 hover:bg-violet-200/80",
  },
  {
    label: EQUIPMENT_OPTIONS[1],
    Icon: Presentation,
    iconClassName: "text-amber-800",
    ringClassName: "bg-amber-100 border-amber-200 hover:bg-amber-200/80",
  },
  {
    label: EQUIPMENT_OPTIONS[2],
    Icon: Tv,
    iconClassName: "text-sky-800",
    ringClassName: "bg-sky-100 border-sky-200 hover:bg-sky-200/80",
  },
  {
    label: EQUIPMENT_OPTIONS[3],
    Icon: Cable,
    iconClassName: "text-slate-700",
    ringClassName: "bg-slate-100 border-slate-200 hover:bg-slate-200/80",
  },
  {
    label: EQUIPMENT_OPTIONS[4],
    Icon: Wifi,
    iconClassName: "text-emerald-800",
    ringClassName: "bg-emerald-100 border-emerald-200 hover:bg-emerald-200/80",
  },
  {
    label: EQUIPMENT_OPTIONS[5],
    Icon: MonitorPlay,
    iconClassName: "text-rose-800",
    ringClassName: "bg-rose-100 border-rose-200 hover:bg-rose-200/80",
  },
];

export function normalizeReservationEquipment(equipment: unknown): string[] {
  if (!Array.isArray(equipment)) return [];
  const set = new Set(equipment.map((x) => String(x)));
  return EQUIPMENT_OPTIONS.filter((opt) => set.has(opt));
}

type ReservationEquipmentIconsProps = {
  equipment: unknown;
  size?: "sm" | "md";
  className?: string;
};

export function ReservationEquipmentIcons({
  equipment,
  size = "sm",
  className,
}: ReservationEquipmentIconsProps) {
  const selected = normalizeReservationEquipment(equipment);
  if (selected.length === 0) return null;

  const dim = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const iconDim = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex flex-wrap justify-end gap-1", className)}>
      {RESERVATION_EQUIPMENT_ICONS.filter((cfg) => selected.includes(cfg.label)).map((cfg) => (
        <Popover key={cfg.label}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-full border shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                dim,
                cfg.ringClassName,
              )}
              aria-label={cfg.label}
            >
              <cfg.Icon className={cn(iconDim, cfg.iconClassName)} aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 text-sm" align="end" side="bottom">
            <p className="text-xs font-medium text-muted-foreground mb-1">อุปกรณ์ที่ขอใช้</p>
            <p className="font-medium leading-snug">{cfg.label}</p>
            <p className="text-xs text-muted-foreground mt-2">
              ไอคอนนี้แสดงว่าการจองนี้ขอใช้{cfg.label.includes("ระบบ") ? "" : " "}
              {cfg.label}
            </p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
