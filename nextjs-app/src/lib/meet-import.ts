/* ------------------------------------------------------------------ */
/*  Spreadsheet reader for the Meet Tracker import                     */
/*                                                                     */
/*  Handles three shapes with no extra dependency:                     */
/*    .csv / .tsv  - text, parsed here                                 */
/*    .xls         - the HTML-table flavour this app exports           */
/*    .xlsx        - a real ZIP, inflated with DecompressionStream     */
/* ------------------------------------------------------------------ */

export interface SheetData {
  headers: string[];
  rows: string[][];
}

/** Splits CSV text, honouring quoted fields, escaped quotes and CRLF. */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }

  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Strips the UTF-8 BOM our own exports write. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function toSheet(rows: string[][]): SheetData {
  const cleaned = rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (!cleaned.length) return { headers: [], rows: [] };

  // Our own .xls export puts a merged title banner above the real header row,
  // so skip leading rows until one looks like a header (2+ filled cells).
  let headerIdx = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const filled = cleaned[i].filter((c) => String(c ?? "").trim() !== "").length;
    if (filled >= 2) { headerIdx = i; break; }
  }

  const headers = cleaned[headerIdx].map((h) => String(h ?? "").trim());
  const rest = cleaned.slice(headerIdx + 1).map((r) => {
    const out = headers.map((_, i) => String(r[i] ?? "").trim());
    return out;
  });

  return { headers, rows: rest };
}

/* ----------------------------- .xls (HTML) ----------------------------- */

function parseHtmlTable(text: string): string[][] {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];

  return Array.from(table.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("th, td")).map((cell) =>
      (cell.textContent || "").replace(/\s+/g, " ").trim(),
    ),
  );
}

/* -------------------------------- .xlsx -------------------------------- */

interface ZipEntry { name: string; offset: number; method: number; size: number; }

/** Reads the ZIP central directory so we can pull single files out. */
function readZipEntries(buf: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // End of central directory: scan backwards for its signature.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65558; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("This does not look like a valid .xlsx file.");

  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const size = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

    entries.push({ name, offset: localOffset, method, size });
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

async function readZipFile(buf: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buf);
  if (view.getUint32(entry.offset, true) !== 0x04034b50) {
    throw new Error("Damaged .xlsx file (bad local header).");
  }
  const nameLen = view.getUint16(entry.offset + 26, true);
  const extraLen = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLen + extraLen;
  const slice = buf.slice(start, start + entry.size);

  if (entry.method === 0) return new TextDecoder().decode(slice);

  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot unzip .xlsx files. Save the sheet as CSV and import that instead.");
  }
  const stream = new Blob([slice]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

/** "BC" -> 54. Needed because empty cells are simply absent from the XML. */
function columnIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
}

/** Excel stores dates as days since 1899-12-30. */
function excelSerialToISO(n: number): string {
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

async function parseXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const entries = readZipEntries(buf);
  const byName = (n: string) => entries.find((e) => e.name === n);

  // Shared strings hold most text; cells reference them by index.
  const shared: string[] = [];
  const sstEntry = byName("xl/sharedStrings.xml");
  if (sstEntry) {
    const xml = new DOMParser().parseFromString(await readZipFile(buf, sstEntry), "application/xml");
    xml.querySelectorAll("si").forEach((si) => {
      const parts = Array.from(si.querySelectorAll("t")).map((t) => t.textContent || "");
      shared.push(parts.join(""));
    });
  }

  const sheetEntry =
    byName("xl/worksheets/sheet1.xml") ||
    entries.find((e) => e.name.startsWith("xl/worksheets/sheet") && e.name.endsWith(".xml"));
  if (!sheetEntry) throw new Error("No worksheet found inside the .xlsx file.");

  const xml = new DOMParser().parseFromString(await readZipFile(buf, sheetEntry), "application/xml");
  const rows: string[][] = [];

  xml.querySelectorAll("sheetData > row").forEach((rowEl) => {
    const cells: string[] = [];
    rowEl.querySelectorAll("c").forEach((c) => {
      const ref = c.getAttribute("r") || "";
      const type = c.getAttribute("t");
      const idx = ref ? columnIndex(ref) : cells.length;

      let value = "";
      if (type === "s") {
        const i = Number(c.querySelector("v")?.textContent || "-1");
        value = shared[i] ?? "";
      } else if (type === "inlineStr") {
        value = Array.from(c.querySelectorAll("t")).map((t) => t.textContent || "").join("");
      } else {
        const raw = c.querySelector("v")?.textContent || "";
        const style = c.getAttribute("s");
        // A plain number in a date-formatted column is an Excel date serial.
        value = style && /^\d{5}(\.\d+)?$/.test(raw) ? excelSerialToISO(Number(raw)) : raw;
      }

      while (cells.length < idx) cells.push("");
      cells[idx] = String(value).trim();
    });
    rows.push(cells);
  });

  return rows;
}

/* ------------------------------ entry point ---------------------------- */

export const ACCEPTED_IMPORT_TYPES = ".xlsx,.xls,.csv,.tsv,.txt";

/**
 * Reads any supported spreadsheet into a header row plus data rows.
 * The format is chosen by extension, then by sniffing the content.
 */
export async function readSpreadsheet(file: File): Promise<SheetData> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx")) {
    return toSheet(await parseXlsx(await file.arrayBuffer()));
  }

  const text = stripBom(await file.text());

  // Excel-exported .xls from this app is really an HTML table.
  if (name.endsWith(".xls") || /<table[\s>]/i.test(text.slice(0, 4000))) {
    const rows = parseHtmlTable(text);
    if (rows.length) return toSheet(rows);
    throw new Error("Could not read this .xls file. Save it as .xlsx or .csv and try again.");
  }

  if (name.endsWith(".tsv")) return toSheet(parseDelimited(text, "\t"));

  // Pick whichever delimiter appears more often on the first line.
  const firstLine = text.split(/\r?\n/)[0] || "";
  const delimiter =
    (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? "\t" : ",";

  return toSheet(parseDelimited(text, delimiter));
}
