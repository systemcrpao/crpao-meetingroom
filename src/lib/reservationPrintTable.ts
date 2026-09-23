import { formatDateThaiBE, formatDateTimeThaiBE, toBuddhistYear } from "@/lib/thaiDate";
import { getRoomLabel, resolveDepartmentForDisplay } from "@/lib/mockData";
import { resolveRoom, type MeetingRoom } from "@/lib/meetingRooms";

export interface ReservationPrintRow {
  id: string;
  trackingNumber?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  topic?: string;
  department?: string;
  departmentOther?: string;
  bookerName?: string;
  status?: string;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateCell(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  return formatDateThaiBE(dateStr);
}

function statusText(status: string | undefined): string {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "pending") return "รออนุมัติ";
  return status ?? "-";
}

export function openReservationTablePrint(
  rows: ReservationPrintRow[],
  options: {
    title: string;
    subtitle?: string;
    rooms?: MeetingRoom[];
  },
): void {
  const assetBase = import.meta.env.BASE_URL;
  const printedAt = formatDateTimeThaiBE(new Date());
  const beYear = toBuddhistYear(new Date());
  const roomList = options.rooms ?? [];

  const bodyRows = rows
    .map((r, i) => {
      const dept = esc(resolveDepartmentForDisplay(r));
      return `<tr>
        <td class="c">${i + 1}</td>
        <td class="c mono">${esc(r.trackingNumber ?? "-")}</td>
        <td>${formatDateCell(r.date)}</td>
        <td class="c">${esc(r.startTime ?? "-")}–${esc(r.endTime ?? "-")}</td>
        <td>${esc(getRoomLabel(resolveRoom(String(r.room ?? "")), roomList))}</td>
        <td>${esc(r.topic ?? "-")}</td>
        <td>${dept}</td>
        <td>${esc(r.bookerName ?? "-")}</td>
        <td class="c">${esc(statusText(r.status))}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>${esc(options.title)}</title>
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
    * { box-sizing: border-box; }
    body {
      font-family: "Sarabun", sans-serif;
      font-size: 11pt;
      color: #111;
      margin: 0;
      padding: 12mm 10mm;
    }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .meta { font-size: 10pt; color: #444; margin-bottom: 12px; line-height: 1.5; }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #333;
      padding: 5px 6px;
      vertical-align: top;
      word-wrap: break-word;
    }
    th {
      background: #e8eef5;
      font-weight: 700;
      font-size: 10pt;
      text-align: center;
    }
    td { font-size: 9.5pt; }
    td.c { text-align: center; }
    td.mono { font-family: ui-monospace, monospace; letter-spacing: 0.05em; }
    col.no { width: 4%; }
    col.track { width: 8%; }
    col.date { width: 12%; }
    col.time { width: 9%; }
    col.room { width: 11%; }
    col.topic { width: 18%; }
    col.dept { width: 14%; }
    col.booker { width: 10%; }
    col.status { width: 8%; }
    @media print {
      body { padding: 8mm; }
      @page { size: A4 landscape; margin: 8mm; }
    }
  </style>
</head>
<body>
  <h1>${esc(options.title)}</h1>
  <div class="meta">
    องค์การบริหารส่วนจังหวัดเชียงราย · ${beYear}<br />
    ${options.subtitle ? esc(options.subtitle) + "<br />" : ""}
    จำนวน ${rows.length} รายการ · พิมพ์เมื่อ ${esc(printedAt)} น.
  </div>
  <table>
    <colgroup>
      <col class="no" /><col class="track" /><col class="date" /><col class="time" />
      <col class="room" /><col class="topic" /><col class="dept" /><col class="booker" /><col class="status" />
    </colgroup>
    <thead>
      <tr>
        <th>ลำดับ</th>
        <th>ติดตาม</th>
        <th>วันที่</th>
        <th>เวลา</th>
        <th>ห้องประชุม</th>
        <th>เรื่อง</th>
        <th>หน่วยงาน</th>
        <th>ผู้จอง</th>
        <th>สถานะ</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="9" class="c">ไม่มีข้อมูล</td></tr>`}
    </tbody>
  </table>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 350); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตแล้วลองพิมพ์อีกครั้ง");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
