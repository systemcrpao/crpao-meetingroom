import {
  DIMENSION_TITLES,
  SCORE_LABELS,
  SURVEY_SECTIONS,
  type DimensionKey,
  type SatisfactionSummary,
  type ScoreKey,
  formatAvgScore,
  satisfactionLevelLabel,
} from "@/lib/bookingFeedback";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function distTable(key: ScoreKey, summary: SatisfactionSummary): string {
  const dist = summary.distributions[key];
  const rows = ([5, 4, 3, 2, 1] as const)
    .map((n) => `<tr><td class="c">${n}</td><td class="c">${dist[n]}</td></tr>`)
    .join("");
  return `
    <p class="sub-h">${esc(SCORE_LABELS[key])}</p>
    <table class="dist">
      <thead><tr><th>คะแนน</th><th>จำนวน (ครั้ง)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function buildSatisfactionReportPrintHtml(
  periodTitle: string,
  generatedAt: string,
  summary: SatisfactionSummary,
): string {
  const assetBase = import.meta.env.BASE_URL;

  const dimRows = (Object.keys(DIMENSION_TITLES) as DimensionKey[])
    .map(
      (dim) => `<tr>
        <td>${esc(DIMENSION_TITLES[dim])}</td>
        <td class="c">${formatAvgScore(summary.dimensionAverages[dim])}</td>
        <td class="c">${esc(satisfactionLevelLabel(summary.dimensionAverages[dim]))}</td>
      </tr>`,
    )
    .join("");

  const itemRows = SURVEY_SECTIONS.flatMap((section) =>
    section.items.map((item) => {
      const avg = summary.averages[item.key];
      return `<tr>
        <td>${esc(section.title)}</td>
        <td>${esc(item.code)}</td>
        <td>${esc(item.label)}</td>
        <td class="c">${formatAvgScore(avg)}</td>
      </tr>`;
    }),
  ).join("");

  const suggestionBlock =
    summary.suggestions.length === 0
      ? '<p class="muted">ไม่มีข้อเสนอแนะในช่วงเวลาที่เลือก</p>'
      : `<ol class="suggest">${summary.suggestions
          .slice(0, 30)
          .map(
            (s) =>
              `<li><span class="meta">[${esc(s.trackingNumber)} · ${esc(s.at)}]</span> ${esc(s.text)}</li>`,
          )
          .join("")}</ol>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>รายงานสรุปความพึงพอใจ — ระบบจองห้องประชุม</title>
  <style>
    @font-face {
      font-family: "Sarabun";
      src: url("${assetBase}Sarabun-Regular.ttf") format("truetype");
      font-weight: 400;
    }
    @font-face {
      font-family: "Sarabun";
      src: url("${assetBase}Sarabun-Bold.ttf") format("truetype");
      font-weight: 700;
    }
    @page { size: A4 portrait; margin: 15mm 18mm; }
    body {
      font-family: "Sarabun", "TH Sarabun New", sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111;
      margin: 0;
    }
    h1 { font-size: 16pt; text-align: center; margin: 0 0 4px; }
    .org { text-align: center; font-size: 12pt; margin-bottom: 2px; }
    .period { text-align: center; font-size: 11pt; margin-bottom: 14px; }
    .meta-line { font-size: 10pt; color: #444; margin-bottom: 16px; }
    h2 { font-size: 13pt; margin: 18px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
    th { background: #f0f4f8; font-weight: 700; }
    td.c, th.c { text-align: center; }
    .dist { max-width: 280px; }
    .sub-h { font-weight: 700; margin: 12px 0 4px; font-size: 10.5pt; }
    .summary-box {
      border: 1px solid #333;
      padding: 10px 12px;
      margin: 12px 0;
      background: #fafafa;
    }
    .muted { color: #555; }
    ol.suggest { margin: 0; padding-left: 1.4em; }
    ol.suggest li { margin-bottom: 8px; }
    .meta { font-size: 9pt; color: #555; }
    .sign { margin-top: 28px; }
    .sign p { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>รายงานสรุปความพึงพอใจต่อระบบจองห้องประชุม</h1>
  <p class="org">องค์การบริหารส่วนจังหวัดเชียงราย</p>
  <p class="period">${esc(periodTitle)}</p>
  <p class="meta-line">จัดทำเมื่อ ${esc(generatedAt)} · แหล่งข้อมูล: แบบประเมินหลังการจองผ่านระบบออนไลน์</p>

  <div class="summary-box">
    <p><strong>จำนวนการตอบแบบประเมิน:</strong> ${summary.totalResponses} รายการ
    (มีคะแนน ${summary.scoredResponses} รายการ)</p>
    <p><strong>สรุปผู้บริหาร:</strong>
    คะแนนเฉลี่ยรวมทุกข้อ ${formatAvgScore(summary.overallAverage)} จาก 5.00
    (${esc(satisfactionLevelLabel(summary.overallAverage))})
    — ใช้ประกอบการพิจารณาปรับปรุงระบบและการให้บริการต่อไป</p>
  </div>

  <h2>1. คะแนนเฉลี่ยรายด้าน</h2>
  <table>
    <thead>
      <tr><th>ด้านการประเมิน</th><th class="c">คะแนนเฉลี่ย</th><th class="c">ระดับ</th></tr>
    </thead>
    <tbody>${dimRows}</tbody>
  </table>

  <h2>2. คะแนนเฉลี่ยรายข้อ</h2>
  <table>
    <thead>
      <tr><th>ด้าน</th><th class="c">ข้อ</th><th>รายการประเมิน</th><th class="c">เฉลี่ย</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <h2>3. การกระจายคะแนน (จำนวนครั้ง)</h2>
  ${SURVEY_SECTIONS.flatMap((s) => s.items.map((i) => distTable(i.key, summary))).join("")}

  <h2>4. ข้อเสนอแนะจากผู้ใช้งาน</h2>
  ${suggestionBlock}

  <div class="sign">
    <p>จึงเรียนมาเพื่อโปรดทราบและพิจารณา</p>
    <br /><br />
    <p style="padding-left: 55%;">(........................................................)</p>
    <p style="padding-left: 55%;">ผู้จัดทำรายงาน</p>
    <p style="padding-left: 55%;">วันที่ ................................................</p>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

export function openSatisfactionReportPdf(periodTitle: string, summary: SatisfactionSummary): void {
  const now = new Date();
  const generatedAt = now.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const html = buildSatisfactionReportPrintHtml(periodTitle, generatedAt, summary);
  const win = window.open("", "_blank");
  if (!win) {
    alert("เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตแล้วลองใหม่");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
