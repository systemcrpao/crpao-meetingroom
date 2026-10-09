import { Headphones, Phone, Building2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  triggerClassName?: string;
  showLabel?: boolean;
  /** แสดงเฉพาะไอคอนจนกว่าจะถึง breakpoint นี้ (เช่น lg บนแท็บเล็ต) */
  compactUntil?: "sm" | "md" | "lg";
};

export function ContactSupportDialog({
  triggerClassName,
  showLabel = true,
  compactUntil,
}: Props) {
  const labelClass =
    !showLabel
      ? "hidden"
      : compactUntil === "lg"
        ? "hidden lg:inline"
        : compactUntil === "md"
          ? "hidden md:inline"
          : compactUntil === "sm"
            ? "hidden sm:inline"
            : "hidden sm:inline";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName ?? "gap-1.5 px-2 sm:px-3"}
          title="ช่องทางติดต่อ"
        >
          <Headphones className="h-3.5 w-3.5 shrink-0" />
          {showLabel && <span className={labelClass}>ติดต่อ</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ช่องทางติดต่อ</DialogTitle>
          <DialogDescription>
            เลือกช่องทางตามประเภทปัญหา
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start gap-2 font-semibold text-foreground">
              <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              แก้ไขเรื่องห้องประชุม
            </div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>ความพร้อมของห้อง อุปกรณ์ ไมค์ โปรเจคเตอร์</li>
              <li>เปลี่ยนแปลงการจอง</li>
              <li>สอบถามสถานะการอนุมัติ (มีหมายเลขติดตาม)</li>
            </ul>
            <p className="flex items-center gap-2 pt-1">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>
                สำนักปลัดฯ — โทรศัพท์ภายใน{" "}
                <a href="tel:0537113503" className="font-medium text-primary underline-offset-2 hover:underline">
                  3503
                </a>
              </span>
            </p>
          </section>
          <section className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start gap-2 font-semibold text-foreground">
              <Wrench className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              แก้ไขปัญหาทางเทคนิค (ระบบจองออนไลน์)
            </div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>เข้าใช้งานไม่ได้ / หน้าจอ error</li>
              <li>ลืมรหัสผ่านผู้ดูแล</li>
              <li>แจ้งปัญหาการใช้งานเว็บไซต์และระบบจองห้องประชุม</li>
            </ul>
            <p className="flex items-center gap-2 pt-1">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>
                งานส่งเสริมและพัฒนาเทคโนโลยีสารสนเทศ <br />
                สำนักปลัดฯ — โทรศัพท์ภายใน{" "}
                <a href="tel:0537113503" className="font-medium text-primary underline-offset-2 hover:underline">
                  3503
                </a>
              </span>
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
