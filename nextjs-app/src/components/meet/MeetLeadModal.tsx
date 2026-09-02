"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Phone, User, UserCheck, Link as LinkIcon, IndianRupee, CalendarClock, Tag, Handshake, X } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCreateMeetLead, useUpdateMeetLead } from "@/hooks/use-meets";
import {
  insertMeetLeadSchema, MEET_STATUSES, MEET_STATUS_CONFIG, LEAD_SOURCES,
  LEAD_TYPES, type InsertMeetLead, type MeetLead,
} from "@/shared/meet-schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a lead to edit it; omit to add a new one. */
  lead?: MeetLead | null;
  /** Types already in use, merged into the preset suggestions. */
  knownTypes?: string[];
  knownOwners?: string[];
}

function emptyLead(): InsertMeetLead {
  return {
    firmName: "",
    contactPerson: "",
    metWith: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    mapLink: "",
    source: "JustDial",
    category: "",
    owner: "",
    dealValue: null,
    status: "new",
    nextMeetDate: "",
    lastContactDate: "",
    notes: "",
  };
}

const LABEL = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

export function MeetLeadModal({ open, onOpenChange, lead, knownTypes = [], knownOwners = [] }: Props) {
  const { toast } = useToast();
  const createLead = useCreateMeetLead();
  const updateLead = useUpdateMeetLead();
  const isEdit = !!lead;
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const form = useForm<InsertMeetLead>({
    resolver: zodResolver(insertMeetLeadSchema) as any,
    defaultValues: emptyLead(),
  });

  // Reload the form whenever the dialog opens for a different lead.
  useEffect(() => {
    if (!open) return;
    setTypeOptions(Array.from(new Set([...LEAD_TYPES, ...knownTypes])));

    if (lead) {
      form.reset({
        firmName: lead.firmName,
        contactPerson: lead.contactPerson || "",
        metWith: lead.metWith || "",
        phone: lead.phone || "",
        email: lead.email || "",
        address: lead.address || "",
        city: lead.city || "",
        mapLink: lead.mapLink || "",
        source: lead.source || "JustDial",
        category: lead.category || "",
        owner: lead.owner || "",
        dealValue: lead.dealValue ?? null,
        status: lead.status,
        nextMeetDate: lead.nextMeetDate || "",
        lastContactDate: lead.lastContactDate || "",
        notes: lead.notes || "",
      });
    } else {
      form.reset(emptyLead());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  const onSubmit = (values: InsertMeetLead) => {
    const payload: InsertMeetLead = {
      ...values,
      dealValue: values.dealValue ? Number(values.dealValue) : null,
    };

    const done = (verb: string) => {
      toast({ title: `Firm ${verb}`, description: `${payload.firmName} is now in your Meet Tracker.` });
      onOpenChange(false);
      form.reset(emptyLead());
    };
    const failed = (err: any) =>
      toast({ title: "Could not save", description: err.message, variant: "destructive" });

    if (isEdit && lead) {
      updateLead.mutate({ id: lead.id, updates: payload }, { onSuccess: () => done("updated"), onError: failed });
    } else {
      createLead.mutate(payload, { onSuccess: () => done("added"), onError: failed });
    }
  };

  const isPending = createLead.isPending || updateLead.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[720px] p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 sm:px-7 pt-6 pb-4 border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-display truncate">
                {isEdit ? "Edit Firm" : "Add New Firm"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {isEdit ? "Update the details for this firm." : "Log a firm you plan to call or visit."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <FormField control={form.control} name="firmName" render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel className={LABEL}>Firm Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Shree Interiors Pvt Ltd" className="h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className={LABEL}>
                      <Tag className="w-3.5 h-3.5 inline mr-1.5" />Type
                    </FormLabel>
                    <FormControl>
                      <Input
                        list="meet-type-options"
                        placeholder="Architect, Contractor, Consultant..."
                        className="h-11 rounded-xl"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <datalist id="meet-type-options">
                      {typeOptions.map((t) => <option key={t} value={t} />)}
                    </datalist>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pick one or type your own.
                    </p>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>
                      <User className="w-3.5 h-3.5 inline mr-1.5" />Contact Person
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Owner / Manager name" className="h-11 rounded-xl" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="metWith" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>
                      <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />Met With
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Architect / person you met" className="h-11 rounded-xl" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>
                      <Phone className="w-3.5 h-3.5 inline mr-1.5" />Phone
                    </FormLabel>
                    <FormControl>
                      <Input type="tel" inputMode="tel" placeholder="+91 98765 43210" className="h-11 rounded-xl" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>
                    <MapPin className="w-3.5 h-3.5 inline mr-1.5" />Address
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Shop no, street, landmark, area" className="rounded-xl resize-none" {...field} value={field.value || ""} />
                  </FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>City / Area</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Nashik" className="h-11 rounded-xl" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="mapLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>
                      <LinkIcon className="w-3.5 h-3.5 inline mr-1.5" />Map / JustDial Link
                    </FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://maps.app.goo.gl/..." className="h-11 rounded-xl" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "JustDial"}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="owner" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Handled By</FormLabel>
                    <FormControl>
                      <Input list="meet-owner-options" placeholder="Your name" className="h-11 rounded-xl" {...field} value={field.value || ""} />
                    </FormControl>
                    <datalist id="meet-owner-options">
                      {knownOwners.map((o) => <option key={o} value={o} />)}
                    </datalist>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "new"}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className="mr-1.5">{MEET_STATUS_CONFIG[s].emoji}</span>
                            {MEET_STATUS_CONFIG[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="nextMeetDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>
                      <CalendarClock className="w-3.5 h-3.5 inline mr-1.5" />Next Meet
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1.5">
                        <Input type="date" className="h-11 rounded-xl flex-1 min-w-0" {...field} value={field.value || ""} />
                        <button
                          type="button"
                          onClick={() => field.onChange("")}
                          disabled={!field.value}
                          title="Clear the next meet date"
                          aria-label="Clear the next meet date"
                          className={cn(
                            "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                            field.value
                              ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              : "text-muted-foreground/30 cursor-not-allowed",
                          )}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="dealValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>
                      <IndianRupee className="w-3.5 h-3.5 inline mr-1.5" />Deal Value
                    </FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" placeholder="25000" className="h-11 rounded-xl"
                        {...field} value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Anything worth remembering before the first call..." className="rounded-xl resize-none" {...field} value={field.value || ""} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className="px-5 sm:px-7 py-4 border-t border-border/60 bg-muted/30 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end shrink-0">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="h-11 rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEdit ? "Save Changes" : "Add Firm"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
