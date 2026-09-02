"use client";

import { useState } from "react";
import {
  PhoneCall, Pencil, Trash2, MapPin, Copy, Check, UserCheck, Phone, ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MEET_STATUS_CONFIG, type MeetLead } from "@/shared/meet-schema";
import { nextMeetChip } from "./MeetLeadCard";
import { buildCopyText, copyText } from "@/lib/meet-copy";
import { useToast } from "@/hooks/use-toast";

interface Props {
  leads: MeetLead[];
  onLogUpdate: (lead: MeetLead) => void;
  onEdit: (lead: MeetLead) => void;
  onDelete: (lead: MeetLead) => void;
}

const ICON_BTN = "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0";

/**
 * The list view on phones. A 10-column grid cannot survive 390px, so the same
 * rows are stacked instead of squeezed - nothing is truncated to initials.
 */
export function MeetLeadCompactList({ leads, onLogUpdate, onEdit, onDelete }: Props) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyAll = async (lead: MeetLead) => {
    const ok = await copyText(buildCopyText(lead));
    if (!ok) {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access.", variant: "destructive" });
      return;
    }
    setCopiedId(lead.id);
    toast({ title: "Copied", description: `${lead.firmName} details copied to clipboard.` });
    setTimeout(() => setCopiedId((id) => (id === lead.id ? null : id)), 1600);
  };

  return (
    <ul className="space-y-2">
      {leads.map((lead, i) => {
        const cfg = MEET_STATUS_CONFIG[lead.status] ?? MEET_STATUS_CONFIG.new;
        const chip = nextMeetChip(lead.nextMeetDate);
        const place = [lead.address, lead.city].filter(Boolean).join(", ");
        const isCopied = copiedId === lead.id;

        return (
          <li
            key={lead.id}
            className="relative bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm"
          >
            <span className={cn("absolute left-0 top-0 h-full w-1", cfg.accent)} />

            <div className="pl-4 pr-3 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-md bg-muted text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => copyAll(lead)}
                  className="min-w-0 flex-1 text-left"
                  title="Tap to copy all details"
                >
                  <span className="block font-bold text-[15px] leading-snug text-foreground break-words">
                    {lead.firmName}
                  </span>
                  {lead.category && (
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-primary/80 mt-0.5">
                      {lead.category}
                    </span>
                  )}
                </button>
                <span className={cn("shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap", cfg.chip)}>
                  {cfg.emoji} {cfg.short}
                </span>
              </div>

              {(lead.contactPerson || lead.metWith) && (
                <div className="text-[13px] text-muted-foreground space-y-0.5">
                  {lead.contactPerson && <span className="block break-words">{lead.contactPerson}</span>}
                  {lead.metWith && (
                    <span className="flex items-center gap-1 text-foreground/75">
                      <UserCheck className="w-3 h-3 shrink-0 text-primary" />
                      <span className="break-words">Met {lead.metWith}</span>
                    </span>
                  )}
                </div>
              )}

              {place && (
                <p className="flex items-start gap-1.5 text-[13px] text-muted-foreground leading-snug">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="break-words">{place}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-bold bg-primary/10 text-primary whitespace-nowrap tabular-nums"
                  >
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </a>
                )}
                {chip && (
                  <span className={cn("inline-block px-2 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap", chip.cls)}>
                    {chip.text}
                  </span>
                )}
                {lead.mapLink && (
                  <a
                    href={lead.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900 whitespace-nowrap"
                  >
                    <MapPin className="w-3 h-3" />
                    Map
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-stretch border-t border-border/60 bg-muted/25">
              <button
                type="button"
                onClick={() => onLogUpdate(lead)}
                className="flex-1 h-10 flex items-center justify-center gap-1.5 text-xs font-bold text-primary active:bg-primary/10"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Update
              </button>
              <span className="w-px bg-border/60" />
              <button
                type="button"
                onClick={() => copyAll(lead)}
                aria-label={`Copy details for ${lead.firmName}`}
                className={cn(ICON_BTN, "h-10 w-12 rounded-none", isCopied ? "text-emerald-500" : "text-muted-foreground")}
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <span className="w-px bg-border/60" />
              <button
                type="button"
                onClick={() => onEdit(lead)}
                aria-label={`Edit ${lead.firmName}`}
                className={cn(ICON_BTN, "h-10 w-12 rounded-none text-muted-foreground")}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <span className="w-px bg-border/60" />
              <button
                type="button"
                onClick={() => onDelete(lead)}
                aria-label={`Delete ${lead.firmName}`}
                className={cn(ICON_BTN, "h-10 w-12 rounded-none text-muted-foreground active:text-destructive")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
