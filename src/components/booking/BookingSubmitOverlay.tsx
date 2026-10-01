import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export type BookingSurveyScores = {
  ease: number;
  clarity: number;
  overall: number;
};

const SURVEY_QUESTIONS: { key: keyof BookingSurveyScores; label: string }[] = [
  { key: "ease", label: "ความสะดวกในการใช้งานระบบจองห้องประชุม" },
  { key: "clarity", label: "ความชัดเจนของขั้นตอนการกรอกแบบฟอร์ม" },
  { key: "overall", label: "ความพึงพอใจโดยรวมต่อการจองครั้งนี้" },
];

type Props = {
  phase: "loading" | "survey" | null;
  scores: BookingSurveyScores;
  onScoreChange: (key: keyof BookingSurveyScores, value: number) => void;
  suggestion: string;
  onSuggestionChange: (value: string) => void;
  onSubmitSurvey: () => void;
  onSkipSurvey: () => void;
  feedbackSaving?: boolean;
};

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-snug">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} คะแนน`}
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
        <Card className="w-full max-w-md shadow-xl border animate-in slide-in-from-bottom-4 fade-in duration-300 max-h-[90vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">แบบประเมินความพึงพอใจ</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              การจองของท่านบันทึกเรียบร้อยแล้ว โปรดให้คะแนน 1–5 (น้อยที่สุดถึงมากที่สุด) เพื่อพัฒนาระบบต่อไป
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            {SURVEY_QUESTIONS.map((q) => (
              <ScoreRow
                key={q.key}
                label={q.label}
                value={scores[q.key]}
                onChange={(n) => onScoreChange(q.key, n)}
              />
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
