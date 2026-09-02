import {
  MEET_STATUSES, MEET_STATUS_CONFIG, type InsertMeetLead, type MeetStatus,
} from "@/shared/meet-schema";

/* ------------------------------------------------------------------ */
/*  Turns spreadsheet columns into leads                               */
/* ------------------------------------------------------------------ */

export type FieldKey =
  | "firmName" | "category" | "contactPerson" | "metWith" | "phone" | "email"
  | "address" | "city" | "mapLink" | "source" | "owner" | "dealValue"
  | "status" | "nextMeetDate" | "lastContactDate" | "notes";

export const IMPORT_IGNORE = "__ignore__";

export interface FieldDef {
  key: FieldKey;
  label: string;
  required?: boolean;
  /** Header spellings that map to this field, all lower case. */
  aliases: string[];
}

export const IMPORT_FIELDS: FieldDef[] = [
  { key: "firmName", label: "Firm Name", required: true,
    aliases: ["firm name", "firm", "company", "company name", "business name", "shop name", "name", "party name", "client name"] },
  { key: "category", label: "Type",
    aliases: ["type", "category", "business type", "firm type", "segment", "industry"] },
  { key: "contactPerson", label: "Contact Person",
    aliases: ["contact person", "contact", "contact name", "person", "owner name", "concern person", "concerned person"] },
  { key: "metWith", label: "Met With",
    aliases: ["met with", "met", "person met", "architect", "architect name", "whom we met", "meeting with"] },
  { key: "phone", label: "Phone",
    aliases: ["phone", "mobile", "mobile no", "mobile number", "phone no", "phone number", "contact no", "contact number", "number", "cell"] },
  { key: "email", label: "Email",
    aliases: ["email", "e mail", "email id", "mail", "mail id"] },
  { key: "address", label: "Address",
    aliases: ["address", "office address", "full address", "location", "add"] },
  { key: "city", label: "City",
    aliases: ["city", "area", "town", "district", "place"] },
  { key: "mapLink", label: "Map / JustDial Link",
    aliases: ["map", "map link", "map / justdial link", "map / jd", "justdial", "just dial", "google map", "google maps", "location link", "link", "url"] },
  { key: "source", label: "Source",
    aliases: ["source", "lead source", "from", "reference"] },
  { key: "owner", label: "Handled By",
    aliases: ["handled by", "owner", "assigned to", "executive", "sales person", "by"] },
  { key: "dealValue", label: "Deal Value",
    aliases: ["deal value", "value", "amount", "budget", "price", "quotation"] },
  { key: "status", label: "Status",
    aliases: ["status", "stage", "lead status", "call status"] },
  { key: "nextMeetDate", label: "Next Meet Date",
    aliases: ["next meet", "next meet date", "next meeting", "next meeting date", "follow up", "follow up date", "next date", "next visit"] },
  { key: "lastContactDate", label: "Last Contact",
    aliases: ["last contact", "last contact date", "last call", "last call date", "last meet", "update date", "date"] },
  { key: "notes", label: "Notes",
    aliases: ["notes", "note", "remark", "remarks", "comment", "comments", "feedback", "description"] },
];

/**
 * Columns we deliberately never import: row numbers, and the derived columns
 * our own export writes out (they are computed from the follow-up trail, so
 * re-importing them would be meaningless).
 */
const SKIP_HEADERS = [
  "sr no", "s no", "serial", "serial no", "#", "sno", "id",
  "total updates", "latest feedback", "last feedback", "update history",
  "added on", "created", "created at", "created on", "updated at",
];

function normalise(h: string): string {
  return h.toLowerCase().replace(/[._/\()-]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Best guess at which field each spreadsheet column holds.
 * Returns one entry per header: a FieldKey, or IMPORT_IGNORE.
 */
export function autoDetectMapping(headers: string[]): string[] {
  const taken = new Set<string>();

  return headers.map((raw) => {
    const h = normalise(raw);
    if (!h || SKIP_HEADERS.some((skip) => normalise(skip) === h)) return IMPORT_IGNORE;

    // Exact alias match wins, then a contains match, and never the same field twice.
    const exact = IMPORT_FIELDS.find((f) => !taken.has(f.key) && f.aliases.some((a) => normalise(a) === h));
    if (exact) { taken.add(exact.key); return exact.key; }

    const partial = IMPORT_FIELDS.find((f) => {
      if (taken.has(f.key)) return false;
      return f.aliases.some((alias) => {
        const a = normalise(alias);
        return h.includes(a) || a.includes(h);
      });
    });
    if (partial) { taken.add(partial.key); return partial.key; }

    return IMPORT_IGNORE;
  });
}

/** Accepts a status label, short name or key, in any casing. */
export function parseStatus(value: string): MeetStatus {
  const v = normalise(value);
  if (!v) return "new";

  const direct = MEET_STATUSES.find((s) => s === value.trim());
  if (direct) return direct;

  const byText = MEET_STATUSES.find((s) => {
    const cfg = MEET_STATUS_CONFIG[s];
    return normalise(cfg.label) === v || normalise(cfg.short) === v || normalise(s) === v;
  });
  if (byText) return byText;

  // Loose wording people actually type into their own sheets.
  if (/(^|\s)won|closed|deal done|converted/.test(v)) return "won";
  if (/not interested|no interest|reject/.test(v)) return "not_interested";
  if (/not pick|no answer|no response|unanswer|switch off|busy/.test(v)) return "not_picked";
  if (/interest/.test(v)) return "interested";
  if (/demo/.test(v)) return "demo";
  if (/meeting fix|meet fix|appointment/.test(v)) return "meeting_fixed";
  if (/follow/.test(v)) return "follow_up";
  if (/lost|dead/.test(v)) return "lost";
  if (/pick|answered|talked|spoke/.test(v)) return "call_pickup";

  return "new";
}

function localISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Normalises the date spellings people use into YYYY-MM-DD. */
export function parseDate(value: string): string {
  const v = value.trim();
  if (!v) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // Excel serial that slipped through as a bare number.
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const d = new Date(Math.round((Number(v) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
  }

  // Day-first, which is what Indian sheets use: 05/09/2026 or 05-09-26.
  const dmy = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, yRaw] = dmy;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    const pad = (x: string) => x.padStart(2, "0");
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  const parsed = new Date(v);
  return isNaN(parsed.getTime()) ? "" : localISO(parsed);
}

export interface BuiltRow {
  lead: InsertMeetLead;
  /** Why this row cannot be imported, if it cannot. */
  problem?: string;
  duplicate?: boolean;
}

/** Digits, plus and spaces only, so stray characters do not reach the dialler. */
function cleanPhone(v: string): string {
  return v.replace(/[^\d+\s()-]/g, "").replace(/\s+/g, " ").trim();
}

function cleanMoney(v: string): number | null {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Applies the column mapping to every data row.
 * `existingNames` marks rows already present in the tracker.
 */
export function buildLeads(
  headers: string[],
  rows: string[][],
  mapping: string[],
  existingNames: Set<string>,
): BuiltRow[] {
  const indexOfField = (key: FieldKey) => mapping.indexOf(key);

  return rows.map((row) => {
    const get = (key: FieldKey): string => {
      const i = indexOfField(key);
      return i === -1 ? "" : String(row[i] ?? "").trim();
    };

    const firmName = get("firmName");
    const lead: InsertMeetLead = {
      firmName,
      category: get("category") || null,
      contactPerson: get("contactPerson") || null,
      metWith: get("metWith") || null,
      phone: cleanPhone(get("phone")) || null,
      email: get("email") || null,
      address: get("address") || null,
      city: get("city") || null,
      mapLink: get("mapLink") || null,
      source: get("source") || null,
      owner: get("owner") || null,
      dealValue: cleanMoney(get("dealValue")),
      status: parseStatus(get("status")),
      nextMeetDate: parseDate(get("nextMeetDate")) || null,
      lastContactDate: parseDate(get("lastContactDate")) || null,
      notes: get("notes") || null,
    };

    if (!firmName) return { lead, problem: "No firm name" };
    if (firmName.length < 2) return { lead, problem: "Firm name too short" };

    const duplicate = existingNames.has(firmName.trim().toLowerCase());
    return { lead, duplicate };
  });
}
