import { Building, Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveRoom, roomColorClass } from "@/lib/mockData";
import type { MeetingRoom } from "@/lib/meetingRooms";
import { Badge } from "@/components/ui/badge";
import { ReservationEquipmentIcons } from "@/components/reservations/ReservationEquipmentIcons";

export type ReservationDayDetail = {
  id: string;
  topic?: string;
  status?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  bookerName?: string;
  department?: string;
  equipment?: unknown;
};

type ReservationDayDetailCardProps = {
  reservation: ReservationDayDetail;
  allRooms: MeetingRoom[];
  density?: "compact" | "comfortable";
};

export function ReservationDayDetailCard({
  reservation: r,
  allRooms,
  density = "compact",
}: ReservationDayDetailCardProps) {
  const isPending = r.status === "pending";
  const isCompact = density === "compact";

  return (
    <div
      className={cn(
        "rounded-md border bg-transparent",
        isCompact ? "p-2 space-y-1" : "rounded-lg p-3 space-y-2",
        isPending
          ? "border-dashed border-muted-foreground/40 bg-muted/20"
          : isCompact
            ? "border-border bg-card"
            : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("font-semibold leading-snug", isCompact ? "text-xs" : "text-sm")}>
          {r.topic}
        </span>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge
            variant={r.status === "approved" ? "default" : "secondary"}
            className={cn(isCompact ? "text-[10px] h-5" : "text-xs")}
          >
            {r.status === "approved" ? "อนุมัติแล้ว" : "รออนุมัติ"}
          </Badge>
          <ReservationEquipmentIcons
            equipment={r.equipment}
            size={isCompact ? "sm" : "md"}
          />
        </div>
      </div>
      <div
        className={cn(
          "grid grid-cols-2 gap-x-4",
          isCompact ? "gap-y-1" : "gap-y-1.5",
        )}
      >
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>
            {r.startTime}–{r.endTime} น.
          </span>
        </div>
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <Badge
            variant="outline"
            className={cn(
              isCompact ? "text-[10px] h-4 px-1.5" : "text-xs",
              roomColorClass(r.room ?? "", true, allRooms),
            )}
          >
            {resolveRoom(r.room ?? "")}
          </Badge>
        </div>
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{r.bookerName}</span>
        </div>
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
          <Building className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{r.department}</span>
        </div>
      </div>
    </div>
  );
}
