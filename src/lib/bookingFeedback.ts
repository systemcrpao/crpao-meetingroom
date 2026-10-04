import { format } from "date-fns";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const BOOKING_FEEDBACK_COLLECTION = "bookingFeedback";

/** คีย์คะแนนใน Firestore / แบบประเมิน */
export type ScoreKey =
  | "bookingStepsClear"
  | "bookingAccessSpeed"
  | "systemEaseOfUse"
  | "editCancelEase"
  | "multiDeviceSupport";

export type BookingSurveyScores = Record<ScoreKey, number>;

export const EMPTY_SURVEY_SCORES: BookingSurveyScores = {
  bookingStepsClear: 0,
  bookingAccessSpeed: 0,
  systemEaseOfUse: 0,
  editCancelEase: 0,
  multiDeviceSupport: 0,
};

export const SCORE_KEYS: ScoreKey[] = [
  "bookingStepsClear",
  "bookingAccessSpeed",
  "systemEaseOfUse",
  "editCancelEase",
  "multiDeviceSupport",
];

export const SURVEY_SECTIONS: {
  title: string;
  items: { key: ScoreKey; code: string; label: string }[];
}[] = [
  {
    title: "ด้านประสิทธิภาพและการใช้งาน",
    items: [
      {
        key: "bookingStepsClear",
        code: "1.1",
        label: "ขั้นตอนการจองห้องประชุมมีความชัดเจน เข้าใจง่าย และไม่ซับซ้อน",
      },
      {
        key: "bookingAccessSpeed",
        code: "1.2",
        label: "ความสะดวกรวดเร็วในการเข้าถึงและทำรายการจอง",
      },
    ],
  },
  {
    title: "ด้านฟังก์ชันการทำงานของระบบ",
    items: [
      {
        key: "systemEaseOfUse",
        code: "2.1",
        label: "ความสะดวกในการใช้งานระบบ",
      },
      {
        key: "editCancelEase",
        code: "2.2",
        label: "ความสะดวกในการแก้ไข เปลี่ยนแปลง หรือยกเลิกการจอง",
      },
    ],
  },
  {
    title: "ด้านการออกแบบและการแสดงผล",
    items: [
      {
        key: "multiDeviceSupport",
        code: "3.1",
        label:
          "การรองรับการใช้งานผ่านอุปกรณ์ที่หลากหลาย (คอมพิวเตอร์, แท็บเล็ต, โทรศัพท์มือถือ)",
      },
    ],
  },
];

export const SCORE_LABELS: Record<ScoreKey, string> = Object.fromEntries(
  SURVEY_SECTIONS.flatMap((s) => s.items.map((i) => [i.key, `${i.code} ${i.label}`])),
) as Record<ScoreKey, string>;

export type DimensionKey = "efficiency" | "functionality" | "design";

export const DIMENSION_TITLES: Record<DimensionKey, string> = {
  efficiency: "ด้านประสิทธิภาพและการใช้งาน",
  functionality: "ด้านฟังก์ชันการทำงานของระบบ",
  design: "ด้านการออกแบบและการแสดงผล",
};

const DIMENSION_KEYS: Record<DimensionKey, ScoreKey[]> = {
  efficiency: ["bookingStepsClear", "bookingAccessSpeed"],
  functionality: ["systemEaseOfUse", "editCancelEase"],
  design: ["multiDeviceSupport"],
};

/** ข้อมูลเก่า (3 ข้อ) — ใช้แสดงในรายงานถ้ายังไม่มีฟิลด์ใหม่ */
export interface BookingFeedbackRow {
  id: string;
  trackingNumber?: string;
  suggestion?: string | null;
  createdAt?: { toDate?: () => Date } | string | null;
  bookingStepsClear?: number | null;
  bookingAccessSpeed?: number | null;
  systemEaseOfUse?: number | null;
  editCancelEase?: number | null;
  multiDeviceSupport?: number | null;
  easeOfUse?: number | null;
  formClarity?: number | null;
  overallSatisfaction?: number | null;
}

function legacyScore(row: BookingFeedbackRow, key: ScoreKey): number | undefined {
  const direct = row[key];
  if (typeof direct === "number" && direct >= 1 && direct <= 5) return direct;

  switch (key) {
    case "bookingStepsClear":
      if (typeof row.formClarity === "number") return row.formClarity;
      break;
    case "systemEaseOfUse":
      if (typeof row.easeOfUse === "number") return row.easeOfUse;
      break;
    case "bookingAccessSpeed":
    case "editCancelEase":
    case "multiDeviceSupport":
      if (typeof row.overallSatisfaction === "number") return row.overallSatisfaction;
      break;
    default:
      break;
  }
  return undefined;
}

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
    .map((r) => legacyScore(r, key))
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
  overallAverage: number;
  dimensionAverages: Record<DimensionKey, number>;
  averages: Record<ScoreKey, number>;
  distributions: Record<ScoreKey, Record<1 | 2 | 3 | 4 | 5, number>>;
  suggestions: { trackingNumber: string; text: string; at: string }[];
}

export function computeSatisfactionSummary(rows: BookingFeedbackRow[]): SatisfactionSummary {
  const averages = {} as Record<ScoreKey, number>;
  const distributions = {} as Record<ScoreKey, Record<1 | 2 | 3 | 4 | 5, number>>;

  for (const key of SCORE_KEYS) {
    const vals = validScores(rows, key);
    averages[key] = averageScore(vals);
    distributions[key] = scoreDistribution(vals);
  }

  const dimensionAverages = {} as Record<DimensionKey, number>;
  for (const dim of Object.keys(DIMENSION_KEYS) as DimensionKey[]) {
    const avgs = DIMENSION_KEYS[dim]
      .map((k) => averages[k])
      .filter((a) => a > 0);
    dimensionAverages[dim] = averageScore(avgs);
  }

  const allAvgs = SCORE_KEYS.map((k) => averages[k]).filter((a) => a > 0);
  const overallAverage = averageScore(allAvgs);

  const scoredIds = new Set<string>();
  for (const row of rows) {
    const hasScore = SCORE_KEYS.some((k) => {
      const v = legacyScore(row, k);
      return typeof v === "number" && v >= 1;
    });
    if (hasScore) scoredIds.add(row.id);
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
    overallAverage,
    dimensionAverages,
    averages,
    distributions,
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

export function surveyScoresToFirestore(scores: BookingSurveyScores): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const key of SCORE_KEYS) {
    out[key] = scores[key] >= 1 && scores[key] <= 5 ? scores[key] : null;
  }
  return out;
}

/** มีแบบประเมินหลังจอง (สำหรับแสดงตราประทับบนแบบพิมพ์เจ้าหน้าที่) */
export async function hasBookingFeedbackForTracking(trackingNumber: string): Promise<boolean> {
  const code = trackingNumber.trim().toUpperCase();
  if (!code) return false;
  const snap = await getDocs(
    query(
      collection(db, BOOKING_FEEDBACK_COLLECTION),
      where("trackingNumber", "==", code),
      limit(1),
    ),
  );
  return !snap.empty;
}
