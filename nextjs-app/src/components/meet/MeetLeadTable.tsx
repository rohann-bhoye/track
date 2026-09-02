"use client";

import { useState } from "react";
import { PhoneCall, Pencil, Trash2, MapPin, Copy, Check, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { MEET_STATUS_CONFIG, type MeetLead } from "@/shared/meet-schema";
import { fmtDay, nextMeetChip } from "./MeetLeadCard";
import { buildCopyText, copyText } from "@/lib/meet-copy";
import { useToast } from "@/hooks/use-toast";
import { MeetLeadCompactList } from "./MeetLeadCompactList";

interface Props {
  leads: MeetLead[];
  onLogUpdate: (lead: MeetLead) => void;
  onEdit: (lead: MeetLead) => void;
  onDelete: (lead: MeetLead) => void;
}

/* A tight spreadsheet grid: every column fits the screen, so there is nothing
   to scroll sideways for. Lower-priority columns drop out on smaller screens
   instead of pushing the table wider than the viewport. */

const TH =
  "border border-border/70 bg-muted/70 px-2 py-1.5 text-left text-[10px] font-bold " +
  "uppercase tracking-wider text-muted-foreground whitespace-nowrap";

const TD = "border border-border/60 px-2 py-1.5 align-middle text-[13px] leading-tight";

const ICON_BTN =
  "inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors shrink-0";

/** Two lines maximum, so every row stays the same compact height. */
const CLAMP2 = "block overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]";

export function MeetLeadTable({ leads, onLogUpdate, onEdit, onDelete }: Props) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyAll = async (lead: MeetLead) => {
    const ok = await copyText(buildCopyText(lead));
    if (!ok) {
      toast({
        title: "Could not copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
      return;
    }
    setCopiedId(lead.id);
    toast({ title: "Copied", description: `${lead.firmName} details copied to clipboard.` });
    setTimeout(() => setCopiedId((id) => (id === lead.id ? null : id)), 1600);
  };

  return (
    <>
      <div className="md:hidden">
        <MeetLeadCompactList
          leads={leads}
          onLogUpdate={onLogUpdate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <div className="hidden md:block bg-card border border-border/70 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className={cn(TH, "w-[4%] text-center")}>#</th>
            <th className={cn(TH, "w-[10%]")}>Type</th>
            <th className={cn(TH, "w-[15%]")}>Firm Name</th>
            <th className={cn(TH, "w-[13%]")}>Contact</th>
            <th className={cn(TH, "w-[16%] hidden lg:table-cell")}>Address</th>
            <th className={cn(TH, "w-[5%] text-center")}>Map</th>
            <th className={cn(TH, "w-[10%]")}>Status</th>
            <th className={cn(TH, "w-[9%]")}>Next Meet</th>
            <th className={cn(TH, "w-[9%] hidden xl:table-cell")}>Last Feedback</th>
            <th className={cn(TH, "w-[9%] text-center")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => {
            const cfg = MEET_STATUS_CONFIG[lead.status] ?? MEET_STATUS_CONFIG.new;
            const chip = nextMeetChip(lead.nextMeetDate);
            const trail = [...(lead.followUps || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
            const latest = trail[0];
            const place = [lead.address, lead.city].filter(Boolean).join(", ");
            const isCopied = copiedId === lead.id;

            return (
              <tr key={lead.id} className={cn("hover:bg-primary/5 transition-colors", i % 2 === 1 && "bg-muted/25")}>
                <td className={cn(TD, "text-center text-muted-foreground font-semibold tabular-nums")}>
                  {i + 1}
                </td>

                <td className={TD} title={lead.category || ""}>
                  {lead.category ? (
                    <span className="block truncate px-1.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary">
                      {lead.category}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                <td className={TD} title={`${lead.firmName} - click to copy all details`}>
                  <button
                    type="button"
                    onClick={() => copyAll(lead)}
                    className="group/name flex items-center gap-1.5 text-left w-full min-w-0"
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.accent)} />
                    <span className={cn(CLAMP2, "font-semibold text-foreground group-hover/name:text-primary transition-colors")}>
                      {lead.firmName}
                    </span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                    )}
                  </button>
                </td>

                <td className={TD} title={[lead.contactPerson, lead.metWith && `Met ${lead.metWith}`, lead.phone].filter(Boolean).join(" | ")}>
                  {lead.contactPerson && (
                    <span className="block truncate text-foreground/90">{lead.contactPerson}</span>
                  )}
                  {lead.metWith && (
                    <span className="flex items-center gap-1 text-[11px] text-foreground/70">
                      <UserCheck className="w-2.5 h-2.5 shrink-0 text-primary" />
                      <span className="truncate">{lead.metWith}</span>
                    </span>
                  )}
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="block truncate text-[12px] text-primary font-semibold hover:underline tabular-nums"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    !lead.contactPerson && !lead.metWith && <span className="text-muted-foreground">-</span>
                  )}
                </td>

                <td className={cn(TD, "hidden lg:table-cell text-muted-foreground")} title={place}>
                  {place ? <span className={CLAMP2}>{place}</span> : "-"}
                </td>

                <td className={cn(TD, "text-center")}>
                  {lead.mapLink ? (
                    <a
                      href={lead.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open map / JustDial listing"
                      className={cn(ICON_BTN, "text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-950")}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                <td className={TD} title={cfg.label}>
                  <span className={cn("block truncate px-1.5 py-0.5 rounded text-[11px] font-bold border text-center", cfg.chip)}>
                    {cfg.short}
                  </span>
                </td>

                <td className={TD}>
                  {chip ? (
                    <span
                      title={chip.text}
                      className={cn("block truncate px-1.5 py-0.5 rounded text-[11px] font-bold border text-center", chip.cls)}
                    >
                      {chip.text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                <td className={cn(TD, "hidden xl:table-cell text-muted-foreground")} title={latest?.note || ""}>
                  {latest ? (
                    <>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        {fmtDay(latest.date)} - {trail.length} update{trail.length > 1 ? "s" : ""}
                      </span>
                      <span className={CLAMP2}>{latest.note || "-"}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No update yet</span>
                  )}
                </td>

                <td className={cn(TD, "text-center")}>
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onLogUpdate(lead)}
                      title="Log a call / meeting update"
                      aria-label={`Log an update for ${lead.firmName}`}
                      className={cn(ICON_BTN, "text-primary hover:bg-primary/10")}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyAll(lead)}
                      title="Copy firm name, number and address"
                      aria-label={`Copy details for ${lead.firmName}`}
                      className={cn(
                        ICON_BTN,
                        "text-muted-foreground hover:bg-muted hover:text-primary",
                        isCopied && "text-emerald-500",
                      )}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(lead)}
                      title="Edit firm"
                      aria-label={`Edit ${lead.firmName}`}
                      className={cn(ICON_BTN, "text-muted-foreground hover:bg-muted hover:text-foreground")}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(lead)}
                      title="Remove firm"
                      aria-label={`Delete ${lead.firmName}`}
                      className={cn(ICON_BTN, "text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </>
  );
}
