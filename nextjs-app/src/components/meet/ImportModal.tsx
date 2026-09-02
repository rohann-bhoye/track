"use client";

import { useMemo, useRef, useState } from "react";
import {
  Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X, ArrowRight,
} from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { readSpreadsheet, ACCEPTED_IMPORT_TYPES, type SheetData } from "@/lib/meet-import";
import {
  autoDetectMapping, buildLeads, IMPORT_FIELDS, IMPORT_IGNORE,
  type BuiltRow,
} from "@/lib/meet-import-map";
import { useImportMeetLeads } from "@/hooks/use-meets";
import { MEET_STATUS_CONFIG, type MeetLead } from "@/shared/meet-schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: MeetLead[];
}

type Step = "pick" | "map";

export function ImportModal({ open, onOpenChange, existing }: Props) {
  const { toast } = useToast();
  const importLeads = useImportMeetLeads();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const existingNames = useMemo(
    () => new Set(existing.map((l) => l.firmName.trim().toLowerCase())),
    [existing],
  );

  const reset = () => {
    setStep("pick");
    setFileName("");
    setSheet(null);
    setMapping([]);
    setReading(false);
    setDragging(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    setReading(true);
    try {
      const data = await readSpreadsheet(file);
      if (!data.headers.length) throw new Error("That file has no readable header row.");
      if (!data.rows.length) throw new Error("That file has a header but no data rows.");

      setSheet(data);
      setMapping(autoDetectMapping(data.headers));
      setFileName(file.name);
      setStep("map");
    } catch (err: any) {
      toast({ title: "Could not read that file", description: err.message, variant: "destructive" });
    } finally {
      setReading(false);
    }
  };

  const built: BuiltRow[] = useMemo(() => {
    if (!sheet) return [];
    return buildLeads(sheet.headers, sheet.rows, mapping, existingNames);
  }, [sheet, mapping, existingNames]);

  const valid = built.filter((b) => !b.problem);
  const broken = built.filter((b) => b.problem);
  const dupes = valid.filter((b) => b.duplicate);
  const toImport = skipDuplicates ? valid.filter((b) => !b.duplicate) : valid;
  const firmMapped = mapping.includes("firmName");

  const setColumn = (index: number, value: string) => {
    setMapping((prev) => {
      const next = [...prev];
      // A field can only come from one column, so clear any earlier claim.
      if (value !== IMPORT_IGNORE) {
        for (let i = 0; i < next.length; i++) if (next[i] === value) next[i] = IMPORT_IGNORE;
      }
      next[index] = value;
      return next;
    });
  };

  const runImport = () => {
    if (!toImport.length) return;
    importLeads.mutate(
      toImport.map((b) => b.lead),
      {
        onSuccess: (res) => {
          toast({
            title: `Imported ${res.created} firm${res.created === 1 ? "" : "s"}`,
            description: res.failed.length
              ? `${res.failed.length} row(s) could not be saved.`
              : "All rows added to the tracker.",
          });
          close(false);
        },
        onError: (err: any) =>
          toast({ title: "Import failed", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="w-[95vw] sm:max-w-[860px] p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 sm:px-7 pt-6 pb-4 border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-display">Import from Excel</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {step === "pick"
                  ? "Upload a .xlsx, .xls or .csv file of firms."
                  : "Check that each column title lines up with the right field."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">
          {step === "pick" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={cn(
                "flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed py-14 px-6 transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border/70 bg-muted/20",
              )}
            >
              {reading ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              ) : (
                <FileSpreadsheet className="w-10 h-10 text-primary/50 mb-4" />
              )}
              <p className="font-semibold text-foreground mb-1">
                {reading ? "Reading your file..." : "Drop your file here"}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Excel (.xlsx, .xls) or CSV. The first row must be the column titles.
              </p>
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={reading} className="rounded-xl h-11 px-6 font-bold">
                Choose File
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_IMPORT_TYPES}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold truncate">{fileName}</span>
                <span className="text-muted-foreground shrink-0">
                  {sheet?.rows.length} row{sheet?.rows.length === 1 ? "" : "s"}
                </span>
                <Button variant="ghost" size="sm" onClick={reset} className="ml-auto h-8 rounded-lg text-xs shrink-0">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Change
                </Button>
              </div>

              {!firmMapped && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-3 py-2.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-800 dark:text-amber-200">
                    Pick which column holds the <strong>Firm Name</strong>. Nothing can be imported without it.
                  </span>
                </div>
              )}

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Column titles found in your file
                </Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sheet?.headers.map((header, i) => {
                    const chosen = mapping[i] ?? IMPORT_IGNORE;
                    const ignored = chosen === IMPORT_IGNORE;
                    return (
                      <div
                        key={`${header}-${i}`}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                          ignored ? "border-border/60 bg-muted/30" : "border-primary/30 bg-primary/5",
                        )}
                      >
                        <span className="min-w-0 flex-1 text-sm font-semibold truncate" title={header}>
                          {header || <span className="text-muted-foreground italic">(no title)</span>}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Select value={chosen} onValueChange={(v) => setColumn(i, v)}>
                          <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={IMPORT_IGNORE}>Do not import</SelectItem>
                            {IMPORT_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}{f.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {toImport.length} ready
                </span>
                {dupes.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900">
                    {dupes.length} already in tracker
                  </span>
                )}
                {broken.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900">
                    {broken.length} skipped (no firm name)
                  </span>
                )}
              </div>

              {dupes.length > 0 && (
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  Skip firms whose name is already in the tracker
                </label>
              )}

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Preview (first 5)
                </Label>
                <div className="mt-2 overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="px-2 py-1.5 text-left font-bold border border-border/60">Firm</th>
                        <th className="px-2 py-1.5 text-left font-bold border border-border/60">Type</th>
                        <th className="px-2 py-1.5 text-left font-bold border border-border/60">Phone</th>
                        <th className="px-2 py-1.5 text-left font-bold border border-border/60">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toImport.slice(0, 5).map((b, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1.5 border border-border/60 font-semibold">{b.lead.firmName}</td>
                          <td className="px-2 py-1.5 border border-border/60">{b.lead.category || "-"}</td>
                          <td className="px-2 py-1.5 border border-border/60 tabular-nums">{b.lead.phone || "-"}</td>
                          <td className="px-2 py-1.5 border border-border/60">
                            {MEET_STATUS_CONFIG[b.lead.status].short}
                          </td>
                        </tr>
                      ))}
                      {!toImport.length && (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground border border-border/60">
                            Nothing to import with the current mapping.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-border/60 bg-muted/30 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end shrink-0">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => close(false)}>
            Cancel
          </Button>
          {step === "map" && (
            <Button
              onClick={runImport}
              disabled={!toImport.length || !firmMapped || importLeads.isPending}
              className="h-11 rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
            >
              {importLeads.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Import {toImport.length} Firm{toImport.length === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
