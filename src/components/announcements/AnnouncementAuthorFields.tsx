import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  useDefaultAuthor: boolean;
  onUseDefaultAuthorChange: (value: boolean) => void;
  defaultAuthorLabel: string;
  customAuthorName: string;
  onCustomAuthorNameChange: (value: string) => void;
};

export function AnnouncementAuthorFields({
  useDefaultAuthor,
  onUseDefaultAuthorChange,
  defaultAuthorLabel,
  customAuthorName,
  onCustomAuthorNameChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">ใช้ชื่อผู้ประกาศต้นฉบับ</p>
          <p className="text-xs text-muted-foreground truncate">
            {useDefaultAuthor
              ? `แสดงเป็น: ${defaultAuthorLabel}`
              : "ปิดแล้ว — กรอกชื่อผู้ประกาศเองด้านล่าง"}
          </p>
        </div>
        <Switch checked={useDefaultAuthor} onCheckedChange={onUseDefaultAuthorChange} />
      </div>
      {!useDefaultAuthor && (
        <div className="space-y-2">
          <Label htmlFor="ann-custom-author">ชื่อผู้ประกาศ</Label>
          <Input
            id="ann-custom-author"
            value={customAuthorName}
            onChange={(e) => onCustomAuthorNameChange(e.target.value)}
            placeholder="เช่น สำนักปลัด อบจ.เชียงราย"
          />
        </div>
      )}
    </div>
  );
}
