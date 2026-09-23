import { resolveDepartmentForDisplay } from "@/lib/mockData";
import { DEFAULT_MEETING_ROOMS, resolveRoom, type MeetingRoom } from "@/lib/meetingRooms";
import { parseApprovedAt } from "@/lib/officialPrintNumber";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const THAI_MONTHS = [
  "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** A4 portrait — ขอบบน/ล่าง 10mm (พื้นที่พิมพ์สูง 277mm) */
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_TOP_BOTTOM_MM = 10;
const PAGE_MARGIN_LEFT_RIGHT_MM = 10;
const PRINTABLE_HEIGHT_MM = A4_HEIGHT_MM - PAGE_MARGIN_TOP_BOTTOM_MM * 2;

const EQUIPMENT_PDF_LABELS: { key: string; label: string }[] = [
  { key: "เครื่องเสียง พร้อม Microphone", label: "เครื่องเสียง พร้อม Microphone" },
  { key: "เครื่องฉาย Projector", label: "เครื่องฉาย Projector" },
  { key: "โทรทัศน์แอลอีดี TV LED", label: "โทรทัศน์แอลอีดี TV LED" },
  { key: "อุปกรณ์ต่อพ่วง", label: "อุปกรณ์ต่อพ่วง" },
  { key: "ระบบอินเตอร์เน็ต", label: "ระบบอินเตอร์เน็ต" },
  { key: "ระบบประชุมวีดิทัศน์ทางไกล VCS", label: "ระบบประชุมวีดิทัศน์ทางไกล VCS" },
];

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatThaiDateParts(d: Date) {
  return {
    day: String(d.getDate()),
    month: THAI_MONTHS[d.getMonth() + 1],
    yearBE: String(d.getFullYear() + 543),
  };
}

function formatMeetingDate(dateField: unknown): string {
  if (!dateField) return "";
  const s = String(dateField);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    const month = THAI_MONTHS[parseInt(m, 10)] ?? m;
    return `${parseInt(d, 10)} ${month} ${parseInt(y, 10) + 543}`;
  }
  return s;
}

function getSortedBookingDates(data: Record<string, unknown>): string[] {
  return ((data.allDates as string[] | undefined) ?? [])
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .slice()
    .sort();
}

export function getBookingDayCount(data: Record<string, unknown>): number {
  const sorted = getSortedBookingDates(data);
  if (sorted.length > 1) return sorted.length;
  const totalDays = Number(data.totalDays ?? 0);
  if (totalDays > 1) return totalDays;
  return 1;
}

/** ช่วงวันที่อย่างเดียว (ไม่รวมข้อความ "รวม N วัน") */
export function formatBookingDateRange(data: Record<string, unknown>): string {
  const sorted = getSortedBookingDates(data);
  if (sorted.length > 1) {
    return `${formatMeetingDate(sorted[0])} ถึง ${formatMeetingDate(sorted[sorted.length - 1])}`;
  }

  const totalDays = Number(data.totalDays ?? 0);
  const start = data.date;
  const end = data.dateEnd;
  if (totalDays > 1 && start && end && String(end) !== String(start)) {
    return `${formatMeetingDate(start)} ถึง ${formatMeetingDate(end)}`;
  }

  if (data.dateDisplay) return String(data.dateDisplay);
  return formatMeetingDate(start);
}

/** สรุปวันที่ (ใช้ในหน้าจองสำเร็จ) */
export function formatBookingPeriod(data: Record<string, unknown>): string {
  const range = formatBookingDateRange(data);
  const days = getBookingDayCount(data);
  if (days > 1) return `${range} (รวม ${days} วัน)`;
  return range;
}

export type ReservationPrintMode = "booking" | "official";

function formatApprovalStamp(d: Date) {
  return {
    dd: String(d.getDate()).padStart(2, "0"),
    mm: String(d.getMonth() + 1).padStart(2, "0"),
    yyyyBE: String(d.getFullYear() + 543),
    hh: String(d.getHours()).padStart(2, "0"),
    min: String(d.getMinutes()).padStart(2, "0"),
  };
}

async function enrichMultiDayData(
  formData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const existing = (formData.allDates as string[] | undefined)?.filter(Boolean) ?? [];
  if (existing.length > 1) return formData;

  const tracking = formData.trackingNumber;
  if (!tracking) return formData;

  try {
    const snap = await getDocs(
      query(collection(db, "reservations"), where("trackingNumber", "==", tracking)),
    );
    const dates = snap.docs
      .map((d) => String(d.data().date ?? ""))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    if (dates.length <= 1) return formData;

    const first = snap.docs.find((d) => d.data().date === dates[0]);
    const base = first ? { ...first.data(), id: first.id } : formData;

    return {
      ...base,
      ...formData,
      date: dates[0],
      dateEnd: dates[dates.length - 1],
      allDates: dates,
      totalDays: dates.length,
    };
  } catch (e) {
    console.warn("enrichMultiDayData:", e);
    return formData;
  }
}

function buildPrintHtml(
  data: Record<string, unknown>,
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
  mode: ReservationPrintMode = "booking",
): string {
  const isOfficial = mode === "official";
  const assetBase = import.meta.env.BASE_URL;
  const now = new Date();
  const { day, month, yearBE } = formatThaiDateParts(now);
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear() + 543);
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  const dept = esc(resolveDepartmentForDisplay(data));
  const topic = esc(data.topic);
  const dateRange = esc(formatBookingDateRange(data));
  const dayCount = getBookingDayCount(data);
  const start = esc(data.startTime);
  const end = esc(data.endTime);
  const scheduleBlock =
    dayCount > 1
      ? `จัดขึ้นในวันที่ ${dateRange}<br />&nbsp;&nbsp;&nbsp;&nbsp;เวลา ${start} น. ถึง เวลา ${end} น. (รวม ${dayCount} วัน)`
      : `จัดขึ้นในวันที่ ${dateRange}&nbsp;&nbsp;&nbsp;&nbsp;เวลา ${start} น. ถึง ${end} น.`;
  const room = resolveRoom(String(data.room ?? ""));
  const participants = esc(data.participants);
  const booker = esc(data.bookerName);
  const position = esc(data.bookerPosition);
  const phone = esc(data.bookerPhone);
  const tracking = esc(data.trackingNumber);
  const equipment: string[] = Array.isArray(data.equipment) ? data.equipment : [];

  const approvedAt = parseApprovedAt(data.approvedAt) ?? new Date();
  const stamp = formatApprovalStamp(approvedAt);
  const officialDocNumber = esc(data.officialDocNumber ?? "");
  const officeHeaderLine = isOfficial && officialDocNumber
    ? `เลขที่ ${officialDocNumber}&nbsp;&nbsp; วันที่ ${stamp.dd}/${stamp.mm}/${stamp.yyyyBE}&nbsp;&nbsp; เวลา ${stamp.hh}:${stamp.min} น.`
    : `เลขที่ ......................&nbsp;&nbsp; วันที่ ........../........../..........&nbsp;&nbsp; เวลา ............. น.`;

  const roomRows = rooms
    .filter((r) => r.enabled)
    .map(
      (r) =>
        `<div class="check-row"><span class="box">${r.value === room ? "X" : "&nbsp;"}</span>${esc(r.label)}</div>`,
    )
    .join("");

  const equipRows = EQUIPMENT_PDF_LABELS.map(
    (item) =>
      `<div class="check-row"><span class="box">${equipment.includes(item.key) ? "X" : "&nbsp;"}</span>${esc(item.label)}</div>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>แบบฟอร์มขอใช้ห้องประชุม</title>
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
    @page {
      size: A4 portrait;
      margin-top: ${PAGE_MARGIN_TOP_BOTTOM_MM}mm;
      margin-bottom: ${PAGE_MARGIN_TOP_BOTTOM_MM}mm;
      margin-left: ${PAGE_MARGIN_LEFT_RIGHT_MM}mm;
      margin-right: ${PAGE_MARGIN_LEFT_RIGHT_MM}mm;
    }
    * { box-sizing: border-box; }
    html, body {
      font-family: "Sarabun", "TH Sarabun New", sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #000;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* ตัวอย่างบนจอ — ให้ขอบบน/ล่างตรงกับตอนพิมพ์ */
    @media screen {
      body {
        box-sizing: border-box;
        width: 210mm;
        min-height: ${A4_HEIGHT_MM}mm;
        margin: 0 auto;
        padding: ${PAGE_MARGIN_TOP_BOTTOM_MM}mm ${PAGE_MARGIN_LEFT_RIGHT_MM}mm;
      }
    }
    .sheet {
      position: relative;
      display: flex;
      width: 100%;
      min-height: ${PRINTABLE_HEIGHT_MM}mm;
      align-items: stretch;
    }
    .sheet-booking-only::before { display: none; }
    .sheet-booking-only .col-left {
      width: 100%;
      flex: 0 0 100%;
      padding-right: 0;
    }
    .sheet-booking-only .col-right { display: none; }
    /* เส้นแบ่งกลาง — สูงเต็มพื้นที่พิมพ์ (ไม่ขึ้นกับความสูงคอลัมน์ซ้าย) */
    .sheet::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 0;
      border-left: 0.5pt solid #000;
      pointer-events: none;
    }
    .col-left {
      width: 50%;
      flex: 0 0 50%;
      padding-right: 4mm;
      overflow-wrap: anywhere;
      word-break: keep-all;
      overflow: hidden;
    }
    .col-right {
      width: 50%;
      flex: 0 0 50%;
      padding-left: 4mm;
      overflow-wrap: anywhere;
      word-break: keep-all;
      overflow: hidden;
    }
    .center { text-align: center; }
    .title { font-size: 14pt; font-weight: 700; margin: 0 0 2pt; }
    .subtitle { margin: 0 0 1pt; }
    .phone { font-size: 9pt; margin: 0; }
    .date-line {
      text-align: right;
      margin: 6pt 0 8pt 0;
    }
    p { margin: 0 0 5pt 0; }
    .tab { margin-left: 24pt; }
    .tab-2 { margin-left: 18pt; }
    .check-row {
      display: flex;
      align-items: flex-start;
      gap: 4pt;
      margin-bottom: 3pt;
      font-size: 10pt;
    }
    .box {
      display: inline-block;
      width: 10pt;
      height: 10pt;
      border: 0.5pt solid #000;
      text-align: center;
      line-height: 10pt;
      font-size: 9pt;
      flex-shrink: 0;
    }
    .staff-block {
      border-top: 0.5pt solid #000;
      margin-top: 10pt;
      padding-top: 8pt;
    }
    .office-box {
      border: 0.5pt solid #000;
      padding: 6pt;
      font-size: 9pt;
      margin-bottom: 10pt;
    }
    .office-box .en {
      font-size: 9pt;
      font-weight: 700;
      margin-bottom: 4pt;
    }
    .eval-box {
      border: 0.5pt solid #000;
      padding: 6pt;
      font-size: 9pt;
      margin-top: 8pt;
    }
    .th-word { white-space: nowrap; }
    /* กระจายตัว (Thai Distributed) — แยกบรรทัดให้ justify ทีละบรรทัด */
    .thai-distribute-block {
      margin-top: 8pt;
      margin-bottom: 5pt;
      font-size: 10pt;
      line-height: 1.5;
    }
    .thai-distribute-block .thai-distributed-line:first-of-type {
      text-indent: 2em;
    }
    .thai-distributed-line {
      margin: 0;
      text-align: justify;
      text-align-last: justify;
      -webkit-text-align-last: justify;
      text-justify: inter-character;
      -webkit-text-justify: inter-character;
      -ms-text-justify: distribute;
    }
    .thai-distributed-plain {
      margin: 0;
      text-align: left;
    }
    @media print {
      html, body {
        margin: 0;
        padding: 0;
        width: auto;
        min-height: auto;
      }
      .sheet {
        min-height: ${PRINTABLE_HEIGHT_MM}mm;
        height: ${PRINTABLE_HEIGHT_MM}mm;
      }
      .sheet::before {
        height: 100%;
        min-height: ${PRINTABLE_HEIGHT_MM}mm;
      }
    }
  </style>
</head>
<body>
  <div class="sheet${isOfficial ? "" : " sheet-booking-only"}">
    <div class="col-left">
      <div class="center">
        <div class="date-line" style="font-weight:700">หมายเลขติดตาม ${tracking}</div>
        <br />
        <p class="title">แบบฟอร์มขอใช้ห้องประชุม</p>
        <p class="subtitle">สำนักปลัดองค์การบริหารส่วนจังหวัด</p>
        <p class="phone">เบอร์โทรศัพท์ภายใน 3503</p>
      </div><br />
      <p class="date-line">วันที่ ${day} เดือน ${month} ${yearBE}</p>

      <p><span class="th-word">เรื่อง</span>&nbsp;&nbsp;&nbsp;ขอใช้ห้องประชุม</p>
      <p><span class="th-word">เรียน</span>&nbsp;&nbsp;&nbsp;หัวหน้าสำนักปลัดองค์การบริหารส่วนจังหวัด</p>
      <p class="tab">ด้วย&nbsp;&nbsp;${dept}</p>
      <p>มีความประสงค์จะให้ดำเนินการประชุม/อบรม&nbsp;:&nbsp;โครงการ/<span class="th-word">เรื่อง</span></p>
      <p style="padding-left:1em">${topic}</p>
      <p>${scheduleBlock}</p>
      <p style="font-size:9.5pt">จึงขอใช้ห้องประชุม (ทั้งนี้ ขอความกรุณาแนบสำเนาโครงการมาด้วย)</p>

      <div class="tab">${roomRows}</div>
      ${participants ? `<p style="text-align:right;font-size:10pt">จำนวนผู้เข้าร่วมประมาณ ${participants} คน</p>` : ""}

      <p style="font-weight:700;margin-top:6pt;font-size:10pt">อุปกรณ์ที่ต้องการ</p>
      <div class="tab">${equipRows}</div>

      <div class="thai-distribute-block">
        <p class="thai-distributed-line">ขณะใช้ห้องประชุมฯ ดังกล่าว จะดูแลความสะอาดและรักษา</p>
        <p class="thai-distributed-line">ทรัพย์สินมิให้เกิดความเสียหาย พร้อมทั้งปิดระบบไฟฟ้าและ</p>
        <p class="thai-distributed-plain">อุปกรณ์ทุกชนิด หลังเสร็จสิ้นการประชุม</p>
      </div>
      <p style="font-size:10pt">
        และมอบหมายให้ ${booker}&nbsp;&nbsp;<br />
        ตำแหน่ง ${position}&nbsp;&nbsp;<br />
        หมายเลขโทรศัพท์ ${phone}&nbsp;&nbsp;เป็นผู้รับผิดชอบ
      </p>
      <p class="tab-2">จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการข้างต้นต่อไป</p><br /><br />
      <p style="padding-left:8em">ลงชื่อ...........................................................</p>
      <p style="padding-left:11.5em">( ............................................ )</p>
      <p style="padding-left:8em">ตำแหน่ง ......................................................</p>

      
    </div>

    <div class="col-right">
      <div class="office-box">
        <div class="en">MEETING ROOM RESERVATION FORM</div>
        <div>${officeHeaderLine}</div>
      </div>

      <div class="staff-block">
        <p style="font-weight:700">เจ้าหน้าที่</p>
        <p>เรียน&nbsp;&nbsp;หัวหน้าสำนักปลัดองค์การบริหารส่วนจังหวัด</p>
        <div class="tab">
          <div class="check-row"><span class="box">&nbsp;</span>ว่าง&nbsp;&nbsp;สามารถใช้งานได้</div>
          <div class="check-row"><span class="box">&nbsp;</span>ไม่ว่าง&nbsp;&nbsp;เนื่องจาก...........................................................</div>
        </div>
        <p>เห็นควรมอบหมายให้...................................................................</p>
        <p>เป็นผู้ดูแลห้องประชุม</p><br />
        <p style="padding-left:8em">ลงชื่อ...........................................................</p>
      <p style="padding-left:11.5em">( ............................................ )</p>
      <p style="padding-left:8em">ตำแหน่ง ......................................................</p>
      </div>

      <div class="staff-block">
        <p style="font-weight:700">ข้อพิจารณา</p>
        <p style="font-size:10pt">ความเห็นหัวหน้าฝ่ายอำนวยการ</p>
        <p style="font-size:10pt">
        <div class="thai-distribute-block">
          <p class="thai-distributed-line">กําชับให้ผู้ใช้ห้องประชุมฯ ดูแลความสะอาดและรักษา</p>
          <p class="thai-distributed-line">ทรัพย์สินร่วมกับเจ้าหน้าที่ประจําห้องประชุม เพื่อมิให้</p>
          <p class="thai-distributed-plain">เกิดความเสียหายพร้อมทั้ง ปิดระบบไฟฟ้าและอุปกรณ์ทุกชนิดหลังเสร็จสิ้นการประชุม</p>
        </div>
        </p>
        <p class="tab-2">จึงเรียนมาเพื่อโปรดพิจารณา</p>
        
        <br /><br /><br /><br />
      </div>
      
      <p style="border-top:0.5pt solid #000;padding-top:8pt;margin-top:12pt;font-weight:700">
        การอนุมัติ (หัวหน้าสำนักปลัดองค์การบริหารส่วนจังหวัด)
      </p>
      <div class="tab">
        <div class="check-row"><span class="box">&nbsp;</span>เห็นชอบ</div>
        <div class="check-row"><span class="box">&nbsp;</span>ดำเนินการ</div>
        <div class="check-row"><span class="box">&nbsp;</span>...............................................................................</div>
      </div>
      <br />
      <br />
      <br />
      <br />
      <div class="eval-box">
        <p>ได้รับความร่วมมือตามเสนอเป็นที่เรียบร้อยแล้ว</p>
        <br />
        <br />
        <p style="padding-left:11.5em">( ............................................ )</p>
        <p style="padding-left:9em">วันที่......................................................</p>
        <p style="font-weight:700">ประเมินความพึงพอใจในการขอรับบริการ</p>
        <p>(&nbsp;&nbsp;) ดีมาก &nbsp; (&nbsp;&nbsp;) ดี &nbsp; (&nbsp;&nbsp;) ปานกลาง &nbsp; (&nbsp;&nbsp;) น้อย &nbsp; (&nbsp;&nbsp;) ควรปรับปรุง</p>
        <p style="font-weight:700">ข้อเสนอแนะ</p>
        <p>...........................................................................................................</p>
        <p>...........................................................................................................</p>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

/** เปิดหน้าพิมพ์ HTML — เบราว์เซอร์จัดวางภาษาไทยถูกต้อง (ไม่ใช้ pdf-lib) */
export const generateReservationPDF = async (
  formData: Record<string, unknown>,
  rooms: MeetingRoom[] = DEFAULT_MEETING_ROOMS,
  mode: ReservationPrintMode = "booking",
) => {
  try {
    const enriched = await enrichMultiDayData(formData);
    const html = buildPrintHtml(enriched, rooms, mode);
    const win = window.open("", "_blank");
    if (!win) {
      alert("เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตแล้วลองใหม่");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (error) {
    console.error("Error generating print form:", error);
    alert("ไม่สามารถเปิดแบบฟอร์มพิมพ์ได้");
  }
};
