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

const GREEN_BAR = 6;

const LOGO_SIZE = 52;

const LOGO_TOP = GREEN_BAR + 10;

const LOGO_LEFT = PADDING;



const COLOR_TEXT = "#0f172a";

const COLOR_TRACKING = "#0f766e";



let fontsReady: Promise<void> | null = null;

let assetsReady: Promise<{ bg: HTMLImageElement; logo: HTMLImageElement }> | null = null;



function fontBase(): string {

  const base = import.meta.env.BASE_URL;

  return base.endsWith("/") ? base : `${base}/`;

}



function assetUrl(name: string): string {

  return `${fontBase()}${name}`;

}



function loadImage(src: string): Promise<HTMLImageElement> {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);

    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    img.src = src;

  });

}



async function ensureCardAssets(): Promise<{ bg: HTMLImageElement; logo: HTMLImageElement }> {

  if (assetsReady) return assetsReady;

  assetsReady = Promise.all([

    loadImage(assetUrl("booking-card-bg.png")),

    loadImage(assetUrl("booking-card-logo.png")),

  ]).then(([bg, logo]) => ({ bg, logo }));

  return assetsReady;

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



function drawImageCover(

  ctx: CanvasRenderingContext2D,

  img: HTMLImageElement,

  w: number,

  h: number,

): void {

  const scale = Math.max(w / img.width, h / img.height);

  const dw = img.width * scale;

  const dh = img.height * scale;

  const dx = (w - dw) / 2;

  const dy = (h - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);

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



/** ตำแหน่ง Y เริ่มบล็อกกลาง (หัวข้อ + รหัสติดตาม) */

function headerBlockStartY(): number {

  return LOGO_TOP + LOGO_SIZE + 14;

}



function measureCardHeight(ctx: CanvasRenderingContext2D, input: BookingCardInput): number {

  const inner = CARD_WIDTH - PADDING * 2;

  let y = headerBlockStartY();



  ctx.font = "700 14px SarabunCard, sans-serif";

  y += 22;



  ctx.font = "700 32px SarabunCard, monospace";

  y += 44;



  ctx.font = "700 16px SarabunCard, sans-serif";

  y += 34;



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

    y += 10;

  }



  y += PADDING;

  return Math.ceil(y);

}



function drawCard(

  ctx: CanvasRenderingContext2D,

  input: BookingCardInput,

  height: number,

  assets: { bg: HTMLImageElement; logo: HTMLImageElement },

): void {

  const inner = CARD_WIDTH - PADDING * 2;



  drawImageCover(ctx, assets.bg, CARD_WIDTH, height);



  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);

  grad.addColorStop(0, "#059669");

  grad.addColorStop(1, "#0d9488");

  ctx.fillStyle = grad;

  ctx.fillRect(0, 0, CARD_WIDTH, GREEN_BAR);



  ctx.drawImage(assets.logo, LOGO_LEFT, LOGO_TOP, LOGO_SIZE, LOGO_SIZE);



  ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";

  ctx.lineWidth = 1;

  ctx.strokeRect(0.5, 0.5, CARD_WIDTH - 1, height - 1);



  let y = headerBlockStartY();

  ctx.fillStyle = COLOR_TEXT;

  ctx.font = "700 14px SarabunCard, sans-serif";

  ctx.textAlign = "center";

  ctx.fillText("หมายเลขติดตามการจองห้องประชุม", CARD_WIDTH / 2, y);

  y += 30;



  ctx.fillStyle = COLOR_TRACKING;

  ctx.font = "700 32px SarabunCard, monospace";

  ctx.fillText(input.trackingNumber, CARD_WIDTH / 2, y);

  y += 40;



  ctx.fillStyle = COLOR_TEXT;

  ctx.font = "700 16px SarabunCard, sans-serif";

  ctx.fillText("องค์การบริหารส่วนจังหวัดเชียงราย", CARD_WIDTH / 2, y);

  y += 32;



  ctx.textAlign = "left";

  const rows: { label: string; value: string }[] = [

    { label: "เรื่อง", value: input.topic },

    { label: "ห้องประชุม", value: getRoomLabel(input.room) },

    { label: "วันที่", value: formatBookingPeriod(input.formData) },

    { label: "เวลา", value: `${input.startTime}–${input.endTime} น.` },

    { label: "ผู้จอง", value: input.bookerName },

  ];



  for (const row of rows) {

    ctx.fillStyle = COLOR_TEXT;

    ctx.font = "700 12px SarabunCard, sans-serif";

    ctx.fillText(row.label, PADDING, y);

    y += 18;

    ctx.fillStyle = COLOR_TEXT;

    ctx.font = "400 15px SarabunCard, sans-serif";

    y = drawMultiline(ctx, row.value, PADDING, y, inner, 15 * LINE);

    y += 10;

  }

}



export async function downloadBookingCardPng(input: BookingCardInput): Promise<void> {

  await Promise.all([ensureSarabunFonts(), ensureCardAssets()]);



  const assets = await ensureCardAssets();



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



  drawCard(ctx, input, height, assets);



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


