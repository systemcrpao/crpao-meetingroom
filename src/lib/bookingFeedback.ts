import { format } from "date-fns";

export interface BookingFeedbackRow {
  id: string;
  trackingNumber?: string;
  easeOfUse?: number | null;
  formClarity?: number | null;
  overallSatisfaction?: number | null;
  suggestion?: string | null;
  createdAt?: { toDate?: () => Date } | string | null;
}

export type ScoreKey = "easeOfUse" | "formClarity" | "overallSatisfaction";

export const SCORE_LABELS: Record<ScoreKey, string> = {
  easeOfUse: "ความสะดวกในการใช้งานระบบ",
  formClarity: "ความชัดเจนของขั้นตอนการกรอกแบบฟอร์ม",
  overallSatisfaction: "ความพึงพอใจโดยรวม",
};

export function parseFeedbackCreatedAt(row: BookingFeedbackRow): Date | null {
  const ts = row.createdAt;
  if (!ts) return null;
  if (typeof ts === "object" && typeof ts.toDate === "function") {
    return ts.toDate();
  }
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function filterFeedbackByPeriod(
  rows: BookingFeedbackRow[],
  viewMode: "month" | "year",
  year: number,
  month: number,
): BookingFeedbackRow[] {
  return rows.filter((row) => {
    const d = parseFeedbackCreatedAt(row);
    if (!d) return false;
    if (viewMode === "month") {
      return d.getFullYear() === year && d.getMonth() === month;
    }
    return d.getFullYear() === year;
  });
}

function validScores(rows: BookingFeedbackRow[], key: ScoreKey): number[] {
  return rows
    .map((r) => r[key])
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
}

export function averageScore(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function scoreDistribution(values: number[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const v of values) {
    if (v >= 1 && v <= 5) dist[v as 1 | 2 | 3 | 4 | 5] += 1;
  }
  return dist;
}

export interface SatisfactionSummary {
  totalResponses: number;
  scoredResponses: number;
  averages: Record<ScoreKey, number>;
  distributions: Record<ScoreKey, Record<1 | 2 | 3 | 4 | 5, number>>;
  suggestions: { trackingNumber: string; text: string; at: string }[];
}

export function computeSatisfactionSummary(rows: BookingFeedbackRow[]): SatisfactionSummary {
  const easeVals = validScores(rows, "easeOfUse");
  const clarityVals = validScores(rows, "formClarity");
  const overallVals = validScores(rows, "overallSatisfaction");

  const scoredIds = new Set<string>();
  for (const row of rows) {
    if (
      (typeof row.easeOfUse === "number" && row.easeOfUse >= 1) ||
      (typeof row.formClarity === "number" && row.formClarity >= 1) ||
      (typeof row.overallSatisfaction === "number" && row.overallSatisfaction >= 1)
    ) {
      scoredIds.add(row.id);
    }
  }

  const suggestions = rows
    .filter((r) => String(r.suggestion ?? "").trim())
    .map((r) => {
      const d = parseFeedbackCreatedAt(r);
      return {
        trackingNumber: String(r.trackingNumber ?? "—"),
        text: String(r.suggestion ?? "").trim(),
        at: d ? format(d, "d/MM/yyyy") : "—",
      };
    });

  return {
    totalResponses: rows.length,
    scoredResponses: scoredIds.size,
    averages: {
      easeOfUse: averageScore(easeVals),
      formClarity: averageScore(clarityVals),
      overallSatisfaction: averageScore(overallVals),
    },
    distributions: {
      easeOfUse: scoreDistribution(easeVals),
      formClarity: scoreDistribution(clarityVals),
      overallSatisfaction: scoreDistribution(overallVals),
    },
    suggestions,
  };
}

export function formatAvgScore(avg: number): string {
  if (avg <= 0) return "—";
  return avg.toFixed(2);
}

export function satisfactionLevelLabel(avg: number): string {
  if (avg <= 0) return "ไม่มีข้อมูล";
  if (avg >= 4.5) return "ดีมาก";
  if (avg >= 4) return "ดี";
  if (avg >= 3) return "ปานกลาง";
  if (avg >= 2) return "ควรปรับปรุง";
  return "ต้องปรับปรุงเร่งด่วน";
}
