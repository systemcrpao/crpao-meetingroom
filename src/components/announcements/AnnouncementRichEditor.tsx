import { useCallback, useEffect, useRef, useState } from "react";
import { Bold, IndentIncrease, IndentDecrease, Underline } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { announcementContentPlainText, sanitizeAnnouncementHtml } from "@/lib/announcementHtml";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
};

export function AnnouncementRichEditor({
  id,
  label = "เนื้อหา",
  value,
  onChange,
  placeholder = "รายละเอียดประกาศ",
  minHeightClass = "min-h-[120px]",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    syncingRef.current = true;
    const clean = sanitizeAnnouncementHtml(el.innerHTML);
    onChange(clean);
    syncingRef.current = false;
  }, [onChange]);

  const exec = (command: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    emitChange();
  };

  const applyColor = (color: string) => {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    emitChange();
  };

  const isEmpty = !announcementContentPlainText(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "rounded-md border bg-background overflow-hidden",
          focused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="ตัวหนา"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("bold")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="ขีดเส้นใต้"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("underline")}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="ย่อหน้า (เยื้องเข้า)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("indent")}
          >
            <IndentIncrease className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="ลดย่อหน้า"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("outdent")}
          >
            <IndentDecrease className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 pl-1 ml-0.5 border-l">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">สี</span>
            <input
              ref={colorRef}
              type="color"
              defaultValue="#0f172a"
              className="h-7 w-8 cursor-pointer rounded border border-border bg-background p-0.5"
              title="สีตัวอักษร"
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => applyColor(e.target.value)}
            />
          </div>
        </div>
        <div className="relative">
          {isEmpty && !focused && (
            <p className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
              {placeholder}
            </p>
          )}
          <div
            id={id}
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "px-3 py-2 text-sm leading-relaxed outline-none",
              minHeightClass,
              "max-h-[320px] overflow-y-auto",
              "[&_ul]:list-disc [&_ul]:pl-5",
            )}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onInput={emitChange}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        เลือกข้อความแล้วใช้ปุ่มด้านบนเพื่อจัดรูปแบบเฉพาะส่วนที่ต้องการ
      </p>
    </div>
  );
}
