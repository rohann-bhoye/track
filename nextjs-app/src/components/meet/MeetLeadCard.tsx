"use client";

import { motion } from "framer-motion";
import {
  MapPin, Phone, ExternalLink, CalendarClock, PhoneCall, Pencil, Trash2,
  History, User, UserCheck, IndianRupee, ChevronDown, Copy, Check, Tag,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MEET_STATUS_CONFIG, nextMeetState, type MeetLead } from "@/shared/meet-schema";
import { buildCopyText, copyText } from "@/lib/meet-copy";
import { useToast } from "@/hooks/use-toast";

interface Props {
  lead: MeetLead;
  index: number;
  onLogUpdate: (lead: MeetLead) => void;
  onEdit: (lead: MeetLead) => void;
  onDelete: (lead: MeetLead) => void;
}

export function fmtDay(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/** Colour + wording for the next-meet chip, driven by how close the date is. */
export function nextMeetChip(dateStr?: string | null) {
  const state = nextMeetState(dateStr);
  const label = fmtDay(dateStr);
  switch (state) {
    case "overdue":
      return { text: `Overdue - ${label}`, cls: "bg-rose-500 text-white border-transparent animate-pulse" };
    case "today":
      return { text: "Meet Today", cls: "bg-amber-500 text-white border-transparent" };
    case "soon":
      return { text: `Meet ${label}`, cls: "bg-primary/15 text-primary border-primary/30" };
    case "later":
      return { text: `Meet ${label}`, cls: "bg-muted text-muted-foreground border-border" };
    default:
      return null;
  }
}

export function MeetLeadCard({ lead, index, onLogUpdate, onEdit, onDelete }: Props) {
  const [showTrail, setShowTrail] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const cfg = MEET_STATUS_CONFIG[lead.status] ?? MEET_STATUS_CONFIG.new;
  const chip = nextMeetChip(lead.nextMeetDate);
  const trail = [...(lead.followUps || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = trail[0];

  const copyAll = async () => {
    const ok = await copyText(buildCopyText(lead));
    if (!ok) {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access.", variant: "destructive" });
      return;
    }
    setCopied(true);
    toast({ title: "Copied", description: `${lead.firmName} details copied to clipboard.` });
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.3) }}
      className="group relative flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300"
    >
      <span className={cn("absolute left-0 top-0 h-full w-1", cfg.accent)} />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md bg-muted text-[10px] font-bold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              {lead.category && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary/80 truncate">
                  <Tag className="w-3 h-3 shrink-0" />
                  {lead.category}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={copyAll}
              title="Click to copy all details"
              className="group/name flex items-start gap-1.5 text-left w-full"
            >
              <h3 className="font-display font-bold text-base sm:text-lg leading-snug text-foreground break-words group-hover/name:text-primary transition-colors">
                {lead.firmName}
              </h3>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-1 opacity-0 group-hover/name:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
          <span className={cn("shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap", cfg.chip)}>
            {cfg.emoji} {cfg.short}
          </span>
        </div>

        {(lead.contactPerson || lead.metWith || lead.phone) && (
          <div className="space-y-1.5 text-sm">
            {lead.contactPerson && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{lead.contactPerson}</span>
              </span>
            )}
            {lead.metWith && (
              <span className="flex items-center gap-1.5 text-foreground/80">
                <UserCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  Met <span className="font-semibold">{lead.metWith}</span>
                </span>
              </span>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 font-semibold text-primary hover:underline whitespace-nowrap tabular-nums"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {lead.phone}
              </a>
            )}
          </div>
        )}

        {(lead.address || lead.city) && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground leading-relaxed">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2 break-words">
              {[lead.address, lead.city].filter(Boolean).join(", ")}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
          {chip && (
            <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border", chip.cls)}>
              <CalendarClock className="w-3 h-3" />
              {chip.text}
            </span>
          )}
          {lead.dealValue ? (
            <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900">
              <IndianRupee className="w-3 h-3" />
              {lead.dealValue.toLocaleString("en-IN")}
            </span>
          ) : null}
          {lead.mapLink && (
            <a
              href={lead.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {lead.source === "JustDial" ? "JustDial" : "Map"}
            </a>
          )}
          {lead.owner && (
            <span className="text-[11px] text-muted-foreground font-medium ml-auto truncate max-w-[45%]">
              {lead.owner}
            </span>
          )}
        </div>

        {latest && (
          <button
            type="button"
            onClick={() => setShowTrail((v) => !v)}
            className="text-left rounded-xl bg-muted/50 border border-border/50 px-3 py-2 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <History className="w-3 h-3" />
              Last update {fmtDay(latest.date)}
              <span className="ml-auto flex items-center gap-1 normal-case tracking-normal">
                {trail.length}
                <ChevronDown className={cn("w-3 h-3 transition-transform", showTrail && "rotate-180")} />
              </span>
            </div>
            {latest.note && (
              <p className={cn("text-xs text-foreground/75 mt-1 leading-relaxed", !showTrail && "line-clamp-2")}>
                {latest.note}
              </p>
            )}
          </button>
        )}

        {showTrail && trail.length > 1 && (
          <ol className="relative border-l border-border/70 ml-1.5 space-y-3 pt-1">
            {trail.slice(1).map((f) => {
              const fcfg = MEET_STATUS_CONFIG[f.status] ?? MEET_STATUS_CONFIG.new;
              return (
                <li key={f.id} className="ml-4">
                  <span className={cn("absolute -left-[4px] mt-1.5 w-2 h-2 rounded-full ring-4 ring-card", fcfg.accent)} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", fcfg.chip)}>
                      {fcfg.short}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtDay(f.date)}</span>
                  </div>
                  {f.note && <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{f.note}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex items-stretch border-t border-border/60 bg-muted/25">
        <Button
          variant="ghost"
          onClick={() => onLogUpdate(lead)}
          className="flex-1 h-11 rounded-none text-xs font-bold text-primary hover:bg-primary/10 gap-1.5"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Update
        </Button>
        <span className="w-px bg-border/60" />
        <Button
          variant="ghost"
          onClick={copyAll}
          className={cn(
            "h-11 w-12 rounded-none text-muted-foreground hover:text-primary",
            copied && "text-emerald-500",
          )}
          aria-label={`Copy details for ${lead.firmName}`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
        <span className="w-px bg-border/60" />
        <Button
          variant="ghost"
          onClick={() => onEdit(lead)}
          className="h-11 w-12 rounded-none text-muted-foreground hover:text-foreground"
          aria-label={`Edit ${lead.firmName}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <span className="w-px bg-border/60" />
        <Button
          variant="ghost"
          onClick={() => onDelete(lead)}
          className="h-11 w-12 rounded-none text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${lead.firmName}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
