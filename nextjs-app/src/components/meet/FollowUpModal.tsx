"use client";

import { useEffect, useState } from "react";
import { Loader2, PhoneCall, CalendarClock, History, MessageSquareText, X } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLogFollowUp } from "@/hooks/use-meets";
import { cn } from "@/lib/utils";
import {
  MEET_STATUSES, MEET_STATUS_CONFIG, todayISO,
  type MeetLead, type MeetStatus,
} from "@/shared/meet-schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: MeetLead | null;
}

function fmt(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Logs what happened on a call or meeting: the outcome status, a note and the
 * date of the next meet. The entry is appended to the activity trail, and the
 * summary fields on the lead roll forward to match.
 */
export function FollowUpModal({ open, onOpenChange, lead }: Props) {
  const { toast } = useToast();
  const logFollowUp = useLogFollowUp();

  const [status, setStatus] = useState<MeetStatus>("call_pickup");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [nextMeetDate, setNextMeetDate] = useState("");
  const [by, setBy] = useState("");

  useEffect(() => {
    if (!open || !lead) return;
    setStatus(lead.status === "new" ? "call_pickup" : lead.status);
    setDate(todayISO());
    setNote("");
    setNextMeetDate(lead.nextMeetDate || "");
    setBy(lead.owner || "");
  }, [open, lead]);

  if (!lead) return null;

  const trail = [...(lead.followUps || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  const save = () => {
    if (!date) {
      toast({ title: "Pick a date", description: "Tell us which day this call happened.", variant: "destructive" });
      return;
    }
    logFollowUp.mutate(
      { id: lead.id, followUp: { date, status, note, nextMeetDate: nextMeetDate || null, by: by || null } },
      {
        onSuccess: () => {
          toast({
            title: "Update saved",
            description: `${lead.firmName} is now marked ${MEET_STATUS_CONFIG[status].label}.`,
          });
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast({ title: "Could not save", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[620px] p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 sm:px-7 pt-6 pb-4 border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-display truncate">{lead.firmName}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Log what happened on this call or meeting.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6">
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              What happened?
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MEET_STATUSES.map((s) => {
                const cfg = MEET_STATUS_CONFIG[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-all",
                      active
                        ? `${cfg.pill} border-transparent shadow-md scale-[1.02]`
                        : "bg-card border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <span className="text-base leading-none">{cfg.emoji}</span>
                    <span className="truncate">{cfg.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fu-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Call / Meet Date
              </Label>
              <Input id="fu-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fu-next" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="w-3.5 h-3.5 inline mr-1.5" />Next Meet Date
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="fu-next"
                  type="date"
                  value={nextMeetDate}
                  onChange={(e) => setNextMeetDate(e.target.value)}
                  className="h-11 rounded-xl flex-1 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setNextMeetDate("")}
                  disabled={!nextMeetDate}
                  title="Clear the next meet date"
                  aria-label="Clear the next meet date"
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    nextMeetDate
                      ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      : "text-muted-foreground/30 cursor-not-allowed",
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fu-note" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <MessageSquareText className="w-3.5 h-3.5 inline mr-1.5" />Feedback
            </Label>
            <Textarea
              id="fu-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did they say? Budget, timing, who to meet next..."
              className="rounded-xl resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fu-by" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Updated By
            </Label>
            <Input id="fu-by" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Your name" className="h-11 rounded-xl" />
          </div>

          {trail.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <History className="w-3.5 h-3.5" />
                Previous Updates
                <span className="ml-auto normal-case tracking-normal font-medium">{trail.length} total</span>
              </div>
              <ol className="relative border-l border-border/70 ml-1.5 space-y-4">
                {trail.map((f) => {
                  const cfg = MEET_STATUS_CONFIG[f.status];
                  return (
                    <li key={f.id} className="ml-5">
                      <span className={cn("absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-background", cfg.accent)} />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded-md border text-[11px] font-bold", cfg.chip)}>
                          {cfg.emoji} {cfg.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">{fmt(f.date)}</span>
                        {f.by && <span className="text-[11px] text-muted-foreground">by {f.by}</span>}
                      </div>
                      {f.note && <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{f.note}</p>}
                      {f.nextMeetDate && (
                        <p className="text-[11px] text-primary font-semibold mt-1">
                          Next meet: {fmt(f.nextMeetDate)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-border/60 bg-muted/30 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end shrink-0">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={logFollowUp.isPending} className="h-11 rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
            {logFollowUp.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
