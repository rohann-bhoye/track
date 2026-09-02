import { MEET_STATUS_CONFIG, type MeetLead } from "@/shared/meet-schema";

/* ------------------------------------------------------------------ */
/*  Excel / CSV export for the Meet Tracker                            */
/*                                                                     */
/*  The .xls writer emits an Excel-flavoured HTML table. Excel, Google */
/*  Sheets and LibreOffice all open it natively with the styling and   */
/*  column widths intact, and it needs no extra dependency.            */
/* ------------------------------------------------------------------ */

const LEAD_COLUMNS = [
  "Sr No",
  "Type",
  "Firm Name",
  "Contact Person",
  "Met With",
  "Phone",
  "Email",
  "Address",
  "City",
  "Map / JustDial Link",
  "Source",
  "Status",
  "Owner",
  "Deal Value",
  "Next Meet Date",
  "Last Contact",
  "Total Updates",
  "Latest Feedback",
  "Notes",
  "Added On",
] as const;

const HISTORY_COLUMNS = [
  "Sr No",
  "Firm Name",
  "Type",
  "Update Date",
  "Status After Call",
  "Feedback / Note",
  "Next Meet Date",
  "Updated By",
] as const;

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(lead: MeetLead): string {
  return MEET_STATUS_CONFIG[lead.status]?.label ?? lead.status;
}

function latestNote(lead: MeetLead): string {
  const trail = lead.followUps || [];
  if (!trail.length) return "";
  const last = [...trail].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return last.note || "";
}

function leadRow(lead: MeetLead, index: number): string[] {
  return [
    String(index + 1),
    lead.category || "",
    lead.firmName,
    lead.contactPerson || "",
    lead.metWith || "",
    lead.phone || "",
    lead.email || "",
    lead.address || "",
    lead.city || "",
    lead.mapLink || "",
    lead.source || "",
    statusLabel(lead),
    lead.owner || "",
    lead.dealValue ? String(lead.dealValue) : "",
    fmtDate(lead.nextMeetDate),
    fmtDate(lead.lastContactDate),
    String((lead.followUps || []).length),
    latestNote(lead),
    lead.notes || "",
    fmtDate(lead.createdAt),
  ];
}

function historyRows(leads: MeetLead[]): string[][] {
  const rows: string[][] = [];
  let sr = 0;
  leads.forEach((lead) => {
    const trail = [...(lead.followUps || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
    trail.forEach((f) => {
      rows.push([
        String(++sr),
        lead.firmName,
        lead.category || "",
        fmtDate(f.date),
        MEET_STATUS_CONFIG[f.status]?.label ?? f.status,
        f.note || "",
        fmtDate(f.nextMeetDate),
        f.by || "",
      ]);
    });
  });
  return rows;
}

/* ---------------------------- writers ---------------------------- */

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sheetHtml(title: string, columns: readonly string[], rows: string[][]): string {
  const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr><th colspan="${columns.length}" class="title">${escapeHtml(title)}</th></tr>` +
    `<tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function workbook(sheets: { name: string; html: string }[]): string {
  const styles = `
    table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
    th { background: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #c7d2fe;
         padding: 6px 10px; text-align: left; white-space: nowrap; }
    th.title { background: #1e1b4b; font-size: 14pt; padding: 10px; }
    td { border: 1px solid #e2e8f0; padding: 5px 10px; vertical-align: top; mso-number-format: "\@"; }
    tr:nth-child(even) td { background: #f8fafc; }
  `;
  const sheetXml = sheets
    .map((s) => `<x:ExcelWorksheet><x:Name>${s.name}</x:Name>` +
      `<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`)
    .join("");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"/><style>${styles}</style>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>${sheetXml}</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body>${sheets.map((s) => s.html).join("<br/>")}</body></html>`;
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Excel workbook with the lead list, plus a second sheet holding every
 * status update when `withHistory` is on.
 */
export function exportMeetLeadsToExcel(leads: MeetLead[], withHistory = true) {
  const sheets = [
    {
      name: "Meet Tracker",
      html: sheetHtml(`Meet Tracker - ${leads.length} firms - ${stamp()}`, LEAD_COLUMNS, leads.map(leadRow)),
    },
  ];

  if (withHistory) {
    const rows = historyRows(leads);
    if (rows.length) {
      sheets.push({
        name: "Update History",
        html: sheetHtml(`Call & Meeting Updates - ${rows.length} entries`, HISTORY_COLUMNS, rows),
      });
    }
  }

  const blob = new Blob(["\ufeff", workbook(sheets)], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  download(blob, `meet-tracker-${stamp()}.xls`);
}

function csvCell(v: string): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Plain CSV, for importing into other CRMs or Google Sheets. */
export function exportMeetLeadsToCsv(leads: MeetLead[]) {
  const lines = [
    LEAD_COLUMNS.join(","),
    ...leads.map((l, i) => leadRow(l, i).map(csvCell).join(",")),
  ];
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  download(blob, `meet-tracker-${stamp()}.csv`);
}
