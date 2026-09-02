"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity, ArrowLeft, CalendarClock, UserCheck, Phone, MapPin,
  Trophy, Building2, PhoneCall, SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMeetLeads } from "@/hooks/use-meets";
import {
  MEET_STATUS_CONFIG, todayISO, type MeetLead, type MeetStatus,
} from "@/shared/meet-schema";

type Range = "today" | "week" | "all";

interface Entry {
  key: string;
  lead: MeetLead;
  status: MeetStatus;
  note: string;
  by: string | null;
  nextMeetDate: string | null;
  callDate: string;
  at: Date | null;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayLabel(iso: string): string {
  if (iso === todayISO()) return "Today";
  if (iso === isoDaysAgo(1)) return "Yesterday";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });
}

function timeLabel(at: Date | null): string {
  if (!at) return "";
  return at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ActivityPage() {
  const { data: leads, isLoading, isLive } = useMeetLeads();
  const [range, setRange] = useState<Range>("today");
  const [person, setPerson] = useState("all");

  const all = useMemo(() => leads || [], [leads]);

  const entries = useMemo<Entry[]>(() => {
    const rows: Entry[] = [];
    all.forEach((lead) => {
      (lead.followUps || []).forEach((f, i) => {
        const at = f.createdAt ? new Date(f.createdAt) : null;
        rows.push({
          key: `${lead.id}-${f.id || i}`,
          lead,
          status: f.status,
          note: f.note || "",
          by: f.by || null,
          nextMeetDate: f.nextMeetDate || null,
          callDate: f.date,
          at: at && !isNaN(at.getTime()) ? at : null,
        });
      });
    });

    return rows.sort((a, b) => {
      const at = a.at ? a.at.getTime() : new Date(a.callDate).getTime();
      const bt = b.at ? b.at.getTime() : new Date(b.callDate).getTime();
      return bt - at;
    });
  }, [all]);

  const people = useMemo(
    () => Array.from(new Set(entries.map((e) => e.by).filter(Boolean) as string[])).sort(),
    [entries],
  );

  const visible = useMemo(() => {
    const from = range === "today" ? todayISO() : range === "week" ? isoDaysAgo(6) : "";
    return entries.filter((e) => {
      if (from && e.callDate < from) return false;
      if (person !== "all" && e.by !== person) return false;
      return true;
    });
  }, [entries, range, person]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    visible.forEach((e) => {
      const list = map.get(e.callDate) || [];
      list.push(e);
      map.set(e.callDate, list);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  const summary = useMemo(() => ({
    updates: visible.length,
    firms: new Set(visible.map((e) => e.lead.id)).size,
    nextMeets: visible.filter((e) => e.nextMeetDate).length,
    won: visible.filter((e) => e.status === "won").length,
  }), [visible]);

  const rangeLabel = range === "today" ? "today" : range === "week" ? "in the last 7 days" : "so far";

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 w-full h-[320px] bg-gradient-to-b from-primary/8 to-transparent pointer-events-none -z-10" />

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <header className="pt-8 sm:pt-12 pb-6">
          <Link
            href="/meet-tracker"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Meet Tracker
          </Link>

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0 rotate-3">
              <Activity className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
                Activity
              </h1>
              <span className={cn(
                "inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border",
                isLive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                  : "bg-muted text-muted-foreground border-border/70",
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50")} />
                {isLive ? "Live" : "Syncing"}
              </span>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Every call and meeting you logged, newest first, with the exact time it was recorded.
              </p>
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryTile icon={PhoneCall} label="Updates" value={summary.updates} tone="primary" />
          <SummaryTile icon={Building2} label="Firms touched" value={summary.firms} tone="default" />
          <SummaryTile icon={CalendarClock} label="Next meets set" value={summary.nextMeets} tone="amber" />
          <SummaryTile icon={Trophy} label="Won" value={summary.won} tone="emerald" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex bg-muted rounded-xl p-1 h-11">
            {(["today", "week", "all"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "flex-1 sm:flex-none px-4 rounded-lg text-xs font-bold capitalize transition-all",
                  range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "week" ? "Last 7 days" : r}
              </button>
            ))}
          </div>

          {people.length > 1 && (
            <Select value={person} onValueChange={setPerson}>
              <SelectTrigger className="h-11 rounded-xl sm:w-[190px]">
                <SelectValue placeholder="Everyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {people.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !visible.length ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-dashed border-border/60">
            <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center mb-5">
              <SearchX className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Nothing logged {rangeLabel}</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Log a call from the tracker and it will show up here with the time.
            </p>
            <div className="flex gap-3">
              {range !== "all" && (
                <Button variant="outline" onClick={() => setRange("all")} className="rounded-xl">
                  Show everything
                </Button>
              )}
              <Link href="/meet-tracker">
                <Button className="rounded-xl font-bold">Go to tracker</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([day, items]) => (
              <section key={day} className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/40">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest",
                    day === todayISO() ? "text-primary" : "text-muted-foreground",
                  )}>
                    {dayLabel(day)}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {items.length} update{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                <ul className="divide-y divide-border/40">
                  {items.map((e) => {
                    const cfg = MEET_STATUS_CONFIG[e.status] ?? MEET_STATUS_CONFIG.new;
                    return (
                      <li key={e.key} className="px-4 py-3 flex gap-3 hover:bg-muted/30 transition-colors">
                        <span className="shrink-0 w-16 pt-0.5 text-[11px] font-bold text-muted-foreground tabular-nums">
                          {timeLabel(e.at) || "--"}
                        </span>

                        <span className={cn("shrink-0 mt-1.5 w-2 h-2 rounded-full", cfg.accent)} />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-sm text-foreground break-words">
                              {e.lead.firmName}
                            </span>
                            {e.lead.category && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                                {e.lead.category}
                              </span>
                            )}
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", cfg.chip)}>
                              {cfg.emoji} {cfg.label}
                            </span>
                          </div>

                          {e.note && (
                            <p className="text-[13px] text-foreground/75 leading-snug mt-1 break-words">
                              {e.note}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            {e.by && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <UserCheck className="w-3 h-3" />
                                {e.by}
                              </span>
                            )}
                            {e.nextMeetDate && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                                <CalendarClock className="w-3 h-3" />
                                Next {new Date(e.nextMeetDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                            {e.lead.phone && (
                              <a href={`tel:${e.lead.phone}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline tabular-nums">
                                <Phone className="w-3 h-3" />
                                {e.lead.phone}
                              </a>
                            )}
                            {e.lead.mapLink && (
                              <a href={e.lead.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline">
                                <MapPin className="w-3 h-3" />
                                Map
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TONES: Record<string, { wrap: string; icon: string; value: string }> = {
  default: { wrap: "border-border/60", icon: "bg-muted text-muted-foreground", value: "text-foreground" },
  primary: { wrap: "border-primary/25", icon: "bg-primary/12 text-primary", value: "text-primary" },
  amber: { wrap: "border-amber-300/50", icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", value: "text-amber-600 dark:text-amber-400" },
  emerald: { wrap: "border-emerald-300/50", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", value: "text-emerald-600 dark:text-emerald-400" },
};

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone] ?? TONES.default;
  return (
    <div className={cn("flex items-center gap-3 bg-card border rounded-2xl px-3.5 py-3 shadow-sm", t.wrap)}>
      <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", t.icon)}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-xl sm:text-2xl font-display font-bold leading-none", t.value)}>
          {value}
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 truncate">
          {label}
        </span>
      </span>
    </div>
  );
}
