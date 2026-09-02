import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Meet Tracker - lead / firm visit pipeline                          */
/* ------------------------------------------------------------------ */

export const MEET_STATUSES = [
  "new",
  "call_pickup",
  "not_picked",
  "interested",
  "demo",
  "meeting_fixed",
  "follow_up",
  "won",
  "not_interested",
  "lost",
] as const;

export const meetStatusEnum = z.enum(MEET_STATUSES);
export type MeetStatus = z.infer<typeof meetStatusEnum>;

/**
 * One entry in the activity trail of a lead. Every time a call is made or a
 * meeting happens a follow-up is appended, so the whole history stays visible.
 */
export const followUpSchema = z.object({
  id: z.string(),
  date: z.string().min(1),              // day the call / meet happened (YYYY-MM-DD)
  status: meetStatusEnum,               // outcome of that contact
  note: z.string().optional().default(""),
  nextMeetDate: z.string().nullable().optional(),
  by: z.string().nullable().optional(), // who made the call
  createdAt: z.coerce.date().nullable().optional(),
});

export type FollowUp = z.infer<typeof followUpSchema>;

export const meetLeadSchema = z.object({
  id: z.string(),
  firmName: z.string().min(1),
  contactPerson: z.string().nullable().optional(),
  metWith: z.string().nullable().optional(),   // who we actually met (architect, PM...)
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  mapLink: z.string().nullable().optional(),   // Google Maps / JustDial listing URL
  source: z.string().nullable().optional(),    // JustDial, Reference, Walk-in...
  category: z.string().nullable().optional(),  // Type: Architect, Contractor, Consultant...
  owner: z.string().nullable().optional(),     // team member handling it
  dealValue: z.coerce.number().nullable().optional(),
  status: meetStatusEnum.default("new"),
  nextMeetDate: z.string().nullable().optional(),
  lastContactDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  followUps: z.array(followUpSchema).optional().default([]),
  createdAt: z.coerce.date().nullable().optional(),
  updatedAt: z.coerce.date().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
});

export type MeetLead = z.infer<typeof meetLeadSchema>;

export const insertMeetLeadSchema = meetLeadSchema
  .omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true, followUps: true })
  .extend({
    firmName: z.string().min(2, "Firm name is too short - give it at least 2 letters"),
  });

export type InsertMeetLead = z.infer<typeof insertMeetLeadSchema>;

export const updateMeetLeadSchema = insertMeetLeadSchema.partial().extend({
  followUps: z.array(followUpSchema).optional(),
});

export type UpdateMeetLead = z.infer<typeof updateMeetLeadSchema>;

/** Payload sent when a call / meet is logged from the "Update" dialog. */
export const logFollowUpSchema = z.object({
  date: z.string().min(1, "Which day did this happen?"),
  status: meetStatusEnum,
  note: z.string().optional().default(""),
  nextMeetDate: z.string().nullable().optional(),
  by: z.string().nullable().optional(),
});

export type LogFollowUp = z.infer<typeof logFollowUpSchema>;

/* ------------------------------------------------------------------ */
/*  Presentation config - colours, labels, emoji per status            */
/* ------------------------------------------------------------------ */

export interface StatusConfig {
  label: string;
  short: string;
  /** Solid pill classes */
  pill: string;
  /** Soft tinted chip classes (light + dark) */
  chip: string;
  /** Accent bar colour */
  accent: string;
  /** Raw hex, used by the Excel export and the bar meters */
  hex: string;
  emoji: string;
}

export const MEET_STATUS_CONFIG: Record<MeetStatus, StatusConfig> = {
  new: {
    label: "New Lead",
    short: "New",
    pill: "bg-slate-500 text-white",
    chip: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    accent: "bg-slate-400",
    hex: "#64748b",
    emoji: "\u{1F195}",
  },
  call_pickup: {
    label: "Call Picked Up",
    short: "Picked",
    pill: "bg-sky-500 text-white",
    chip: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900",
    accent: "bg-sky-500",
    hex: "#0ea5e9",
    emoji: "\u{1F4DE}",
  },
  not_picked: {
    label: "Not Picked Up",
    short: "No Answer",
    pill: "bg-amber-500 text-white",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    accent: "bg-amber-500",
    hex: "#f59e0b",
    emoji: "\u{1F4F5}",
  },
  interested: {
    label: "Interested",
    short: "Interested",
    pill: "bg-violet-500 text-white",
    chip: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900",
    accent: "bg-violet-500",
    hex: "#8b5cf6",
    emoji: "\u{2728}",
  },
  demo: {
    label: "Demo Given",
    short: "Demo",
    pill: "bg-indigo-500 text-white",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900",
    accent: "bg-indigo-500",
    hex: "#6366f1",
    emoji: "\u{1F5A5}",
  },
  meeting_fixed: {
    label: "Meeting Fixed",
    short: "Meet Fixed",
    pill: "bg-cyan-500 text-white",
    chip: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-900",
    accent: "bg-cyan-500",
    hex: "#06b6d4",
    emoji: "\u{1F91D}",
  },
  follow_up: {
    label: "Follow Up",
    short: "Follow Up",
    pill: "bg-orange-500 text-white",
    chip: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900",
    accent: "bg-orange-500",
    hex: "#f97316",
    emoji: "\u{1F501}",
  },
  won: {
    label: "Won / Closed",
    short: "Won",
    pill: "bg-emerald-500 text-white",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
    accent: "bg-emerald-500",
    hex: "#10b981",
    emoji: "\u{1F3C6}",
  },
  not_interested: {
    label: "Not Interested",
    short: "Not Int.",
    pill: "bg-rose-500 text-white",
    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
    accent: "bg-rose-500",
    hex: "#f43f5e",
    emoji: "\u{1F6AB}",
  },
  lost: {
    label: "Lost",
    short: "Lost",
    pill: "bg-zinc-600 text-white",
    chip: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700",
    accent: "bg-zinc-500",
    hex: "#52525b",
    emoji: "\u{1F4A4}",
  },
};

/** Statuses that still count as "in play" for the pipeline stat. */
export const ACTIVE_STATUSES: MeetStatus[] = [
  "new",
  "call_pickup",
  "not_picked",
  "interested",
  "demo",
  "meeting_fixed",
  "follow_up",
];

/** Statuses that are closed one way or the other. */
export const CLOSED_STATUSES: MeetStatus[] = ["won", "not_interested", "lost"];

/** Preset firm types. The form still accepts anything typed by hand. */
export const LEAD_TYPES = [
  "Architect",
  "Contractor",
  "Consultant",
  "Interior Designer",
  "Builder / Developer",
  "PR Agency",
  "Furniture / Showroom",
  "Salon and Spa",
  "Cafe / Restaurant",
  "Retail Shop",
  "Vendor / Supplier",
  "Other",
] as const;

export const LEAD_SOURCES = [
  "JustDial",
  "Google Maps",
  "Reference",
  "Walk-in",
  "Instagram",
  "WhatsApp",
  "Cold Call",
  "Other",
] as const;

/** Today as YYYY-MM-DD in the browser/server local timezone. */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * How a scheduled next-meet date relates to today.
 * Drives the red "overdue" / amber "today" highlights on cards and rows.
 */
export function nextMeetState(dateStr?: string | null): "none" | "overdue" | "today" | "soon" | "later" {
  if (!dateStr) return "none";
  const today = todayISO();
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  const diff = (new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000;
  return diff <= 3 ? "soon" : "later";
}
