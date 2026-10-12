import {
  announcementContentPlainText,
  isProbablyAnnouncementHtml,
  sanitizeAnnouncementHtml,
} from "@/lib/announcementHtml";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

export function AnnouncementContentView({ content, className }: Props) {
  const plain = content.trim();
  if (!plain) return null;

  if (isProbablyAnnouncementHtml(plain)) {
    const safe = sanitizeAnnouncementHtml(plain);
    return (
      <div
        className={cn(
          "text-sm leading-relaxed text-foreground flex-1",
          "[&_b]:font-bold [&_strong]:font-bold [&_u]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-3 [&_blockquote]:my-1",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return (
    <div className={cn("text-sm leading-relaxed whitespace-pre-wrap text-foreground flex-1", className)}>
      {announcementContentPlainText(plain) || plain}
    </div>
  );
}
