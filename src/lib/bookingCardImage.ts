import { formatBookingPeriod } from "@/lib/pdfGenerator";
import { getRoomLabel } from "@/lib/mockData";

export interface BookingCardInput {
  trackingNumber: string;
  topic: string;
  room: string;
  formData: Record<string, unknown>;
  startTime: string;
  endTime: string;
  bookerName: string;
}

const CARD_WIDTH = 420;
const PADDING = 28;
const LINE = 1.45;

let fontsReady: Promise<void> | null = null;

function fontBase(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith("/") ? base : `${base}/`;
}

async function ensureSarabunFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    const root = fontBase();
    const regular = new FontFace("SarabunCard", `url(${root}Sarabun-Regular.ttf)`);
    const bold = new FontFace("SarabunCard", `url(${root}Sarabun-Bold.ttf)`, { weight: "700" });
    await Promise.all([regular.load(), bold.load()]);
    document.fonts.add(regular);
    document.fonts.add(bold);
  })();
  return fontsReady;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

/** ตัดบรรทัด (รองรับข้อความไทยที่ไม่มี space) */
function wrapThai(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [""];
  if (/\s/.test(text)) return wrapLines(ctx, text, maxWidth);
  const lines: string[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i + 1;
    while (j <= text.length && ctx.measureText(text.slice(i, j)).width <= maxWidth) j++;
    const end = j === i + 1 ? j : j - 1;
    lines.push(text.slice(i, end));
    i = end;
  }
  return lines;
}

function drawMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapThai(ctx, text, maxWidth);
  for (const ln of lines) {
    ctx.fillText(ln, x, y);
    y += lineHeight;
  }
  return y;
}

function measureCardHeight(ctx: CanvasRenderingContext2D, input: BookingCardInput): number {
  const inner = CARD_WIDTH - PADDING * 2;
  let y = PADDING + 8;

  ctx.font = "700 22px SarabunCard, sans-serif";
  y += 28;

  ctx.font = "700 32px SarabunCard, monospace";
  y += 40;

  ctx.font = "400 13px SarabunCard, sans-serif";
  y += 36;

  const rows: { label: string; value: string }[] = [
    { label: "เรื่อง", value: input.topic },
    { label: "ห้องประชุม", value: getRoomLabel(input.room) },
    { label: "วันที่", value: formatBookingPeriod(input.formData) },
    { label: "เวลา", value: `${input.startTime}–${input.endTime} น.` },
    { label: "ผู้จอง", value: input.bookerName },
  ];

  for (const row of rows) {
    y += 18;
    ctx.font = "400 15px SarabunCard, sans-serif";
    const lines = wrapThai(ctx, row.value, inner);
    y += lines.length * 15 * LINE;
    y += 8;
  }

  y += PADDING;
  return Math.ceil(y);
}

function drawCard(ctx: CanvasRenderingContext2D, input: BookingCardInput, height: number): void {
  const inner = CARD_WIDTH - PADDING * 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_WIDTH, height);

  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);
  grad.addColorStop(0, "#059669");
  grad.addColorStop(1, "#0d9488");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, 6);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, CARD_WIDTH - 1, height - 1);

  let y = PADDING + 4;
  ctx.fillStyle = "#64748b";
  ctx.font = "400 13px SarabunCard, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("หมายเลขติดตามการจองห้องประชุม", CARD_WIDTH / 2, y);
  y += 28;

  ctx.fillStyle = "#0f766e";
  ctx.font = "700 32px SarabunCard, monospace";
  ctx.fillText(input.trackingNumber, CARD_WIDTH / 2, y);
  y += 36;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 12px SarabunCard, sans-serif";
  ctx.fillText("องค์การบริหารส่วนจังหวัดเชียงราย", CARD_WIDTH / 2, y);
  y += 28;

  ctx.textAlign = "left";
  const rows: { label: string; value: string }[] = [
    { label: "เรื่อง", value: input.topic },
    { label: "ห้องประชุม", value: getRoomLabel(input.room) },
    { label: "วันที่", value: formatBookingPeriod(input.formData) },
    { label: "เวลา", value: `${input.startTime}–${input.endTime} น.` },
    { label: "ผู้จอง", value: input.bookerName },
  ];

  for (const row of rows) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "400 12px SarabunCard, sans-serif";
    ctx.fillText(row.label, PADDING, y);
    y += 18;
    ctx.fillStyle = "#0f172a";
    ctx.font = "400 15px SarabunCard, sans-serif";
    y = drawMultiline(ctx, row.value, PADDING, y, inner, 15 * LINE);
    y += 10;
  }
}

export async function downloadBookingCardPng(input: BookingCardInput): Promise<void> {
  await ensureSarabunFonts();

  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = CARD_WIDTH;
  measureCanvas.height = 10;
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("Canvas not supported");

  const height = measureCardHeight(measureCtx, input);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  drawCard(ctx, input, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create PNG"))), "image/png");
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booking-${input.trackingNumber}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
