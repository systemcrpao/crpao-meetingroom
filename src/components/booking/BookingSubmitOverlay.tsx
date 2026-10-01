import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SURVEY_SECTIONS,
  type BookingSurveyScores,
  type ScoreKey,
} from "@/lib/bookingFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export type { BookingSurveyScores };

type Props = {
  phase: "loading" | "survey" | null;
  scores: BookingSurveyScores;
  onScoreChange: (key: ScoreKey, value: number) => void;
  suggestion: string;
  onSuggestionChange: (value: string) => void;
  onSubmitSurvey: () => void;
  onSkipSurvey: () => void;
  feedbackSaving?: boolean;
};

function ScoreRow({
  code,
  label,
  value,
  onChange,
}: {
  code: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2 pl-1">
      <p className="text-sm font-medium leading-snug">
        <span className="text-muted-foreground font-semibold tabular-nums">{code}</span>{" "}
        {label}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${code} ${n} คะแนน`}
            onClick={() => onChange(n)}
            className={cn(
              "h-9 w-9 rounded-md border text-sm font-semibold transition-colors",
              value === n
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BookingSubmitOverlay({
  phase,
  scores,
  onScoreChange,
  suggestion,
  onSuggestionChange,
  onSubmitSurvey,
  onSkipSurvey,
  feedbackSaving,
}: Props) {
  if (!phase) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-busy={phase === "loading"}
    >
      {phase === "loading" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-in zoom-in-95 duration-300">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-150" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">กำลังจองห้องประชุม</p>
            <p className="text-sm text-muted-foreground mt-1">กรุณารอสักครู่ ระบบกำลังบันทึกข้อมูลการจอง</p>
          </div>
        </div>
      )}

      {phase === "survey" && (
        <Card className="w-full max-w-lg shadow-xl border animate-in slide-in-from-bottom-4 fade-in duration-300 max-h-[90vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">แบบประเมินความพึงพอใจ</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              การจองของท่านบันทึกเรียบร้อยแล้ว โปรดให้คะแนน 1–5 (น้อยที่สุดถึงมากที่สุด) ตามข้อด้านล่าง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-6">
            {SURVEY_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary border-b pb-1">
                  {section.title}
                </p>
                <div className="space-y-4">
                  {section.items.map((item) => (
                    <ScoreRow
                      key={item.key}
                      code={item.code}
                      label={item.label}
                      value={scores[item.key]}
                      onChange={(n) => onScoreChange(item.key, n)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <p className="text-sm font-medium">ข้อเสนอแนะเพิ่มเติม</p>
              <Textarea
                placeholder="ระบุข้อเสนอแนะหรือปัญหาที่พบ (ถ้ามี)"
                value={suggestion}
                onChange={(e) => onSuggestionChange(e.target.value)}
                className="min-h-[88px] text-sm resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button type="button" variant="ghost" className="sm:flex-1" onClick={onSkipSurvey} disabled={feedbackSaving}>
                ข้าม
              </Button>
              <Button type="button" className="sm:flex-1" onClick={onSubmitSurvey} disabled={feedbackSaving}>
                {feedbackSaving ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
