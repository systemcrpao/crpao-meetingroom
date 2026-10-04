import { Megaphone, X } from "lucide-react";
import {
  type Announcement,
  announcementUpdatedKey,
  saveDismissedAnnouncementKey,
} from "@/lib/announcements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PublicAnnouncementDialog({ announcement, open, onOpenChange }: Props) {
  if (!announcement) return null;

  const handleClose = () => {
    saveDismissedAnnouncementKey(`${announcement.id}:${announcementUpdatedKey(announcement)}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="relative bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 px-5 py-4 text-white pr-12">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            onClick={handleClose}
            aria-label="ปิดประกาศ"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-medium uppercase tracking-wide">
              <Megaphone className="h-3.5 w-3.5" />
              ประกาศ
            </div>
            <DialogTitle className="text-lg font-bold text-white leading-snug pr-2">
              {announcement.title}
            </DialogTitle>
            <DialogDescription className="sr-only">เนื้อหาประกาศจากองค์การบริหารส่วนจังหวัดเชียงราย</DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-4 min-h-[120px] flex flex-col">
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground flex-1">
            {announcement.content}
          </div>
          <p className="text-xs text-muted-foreground text-right mt-4 pt-3 border-t">
            ประกาศโดย {announcement.authorName?.trim() || announcement.authorEmail || "Super Admin"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
