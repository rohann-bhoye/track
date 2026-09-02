"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Handshake, Plus, Search, LayoutGrid, List, Download, FileSpreadsheet,
  FileText, ArrowLeft, Loader2, SearchX, CalendarClock, Trophy, Flame,
  PhoneCall, Building2, RotateCcw, Upload, SlidersHorizontal, ChevronDown, Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { useMeetLeads, useDeleteMeetLead } from "@/hooks/use-meets";
import { MeetLeadModal } from "@/components/meet/MeetLeadModal";
import { FollowUpModal } from "@/components/meet/FollowUpModal";
import { MeetLeadCard } from "@/components/meet/MeetLeadCard";
import { MeetLeadTable } from "@/components/meet/MeetLeadTable";
import { ImportModal } from "@/components/meet/ImportModal";
import { exportMeetLeadsToExcel, exportMeetLeadsToCsv } from "@/lib/meet-export";
import {
  MEET_STATUSES, MEET_STATUS_CONFIG, ACTIVE_STATUSES, nextMeetState, todayISO,
  type MeetLead, type MeetStatus,
} from "@/shared/meet-schema";

type ViewMode = "card" | "list";
type SortKey = "recent" | "next_meet" | "firm" | "type" | "status";

const VIEW_KEY = "meet_tracker_view";

export default function MeetTrackerPage() {
  const { data: leads, isLoading, isError, refetch, isFetching, isLive } = useMeetLeads();
  const deleteLead = useDeleteMeetLead();
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MeetStatus>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [dueOnly, setDueOnly] = useState(false);

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editing, setEditing] = useState<MeetLead | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpLead, setFollowUpLead] = useState<MeetLead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MeetLead | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Remember the last chosen view. Cards are the default on a fresh browser,
  // and the restore runs after mount so server and client markup agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === "list" || saved === "card") setView(saved);
    } catch {
      /* private mode - keep the default */
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setView(mode);
    try {
      window.localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* private mode - not worth failing over */
    }
  };

  const all = useMemo(() => leads || [], [leads]);

  const types = useMemo(
    () => Array.from(new Set(all.map((l) => l.category).filter(Boolean) as string[])).sort(),
    [all],
  );

  const owners = useMemo(
    () => Array.from(new Set(all.map((l) => l.owner).filter(Boolean) as string[])).sort(),
    [all],
  );

  const stats = useMemo(() => {
    const dueToday = all.filter((l) => nextMeetState(l.nextMeetDate) === "today").length;
    const overdue = all.filter((l) => nextMeetState(l.nextMeetDate) === "overdue").length;
    return {
      total: all.length,
      active: all.filter((l) => ACTIVE_STATUSES.includes(l.status)).length,
      won: all.filter((l) => l.status === "won").length,
      interested: all.filter((l) => ["interested", "demo", "meeting_fixed"].includes(l.status)).length,
      dueToday,
      overdue,
      updates: all.reduce((sum, l) => sum + (l.followUps?.length || 0), 0),
      updatesToday: all.reduce(
        (sum, l) => sum + (l.followUps || []).filter((f) => f.date === todayISO()).length,
        0,
      ),
    };
  }, [all]);

  const statusCounts = useMemo(() => {
    const counts = {} as Record<MeetStatus, number>;
    MEET_STATUSES.forEach((s) => {
      counts[s] = all.filter((l) => l.status === s).length;
    });
    return counts;
  }, [all]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = all.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (typeFilter !== "all" && (l.category || "") !== typeFilter) return false;
      if (dueOnly) {
        const state = nextMeetState(l.nextMeetDate);
        if (state !== "today" && state !== "overdue") return false;
      }
      if (!q) return true;
      return [
        l.firmName, l.contactPerson, l.metWith, l.phone, l.email,
        l.address, l.city, l.category, l.owner, l.source, l.notes,
        ...(l.followUps || []).map((f) => f.note),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const rank = (l: MeetLead) => MEET_STATUSES.indexOf(l.status);
    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case "firm":
          return a.firmName.localeCompare(b.firmName);
        case "type":
          return (a.category || "zzz").localeCompare(b.category || "zzz");
        case "status":
          return rank(a) - rank(b);
        case "next_meet": {
          // Leads without a date sink to the bottom, soonest first otherwise.
          if (!a.nextMeetDate && !b.nextMeetDate) return 0;
          if (!a.nextMeetDate) return 1;
          if (!b.nextMeetDate) return -1;
          return a.nextMeetDate.localeCompare(b.nextMeetDate);
        }
        default: {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        }
      }
    });

    return rows;
  }, [all, search, statusFilter, typeFilter, sortBy, dueOnly]);

  const openAdd = () => {
    setEditing(null);
    setLeadModalOpen(true);
  };

  const openEdit = (lead: MeetLead) => {
    setEditing(lead);
    setLeadModalOpen(true);
  };

  const openFollowUp = (lead: MeetLead) => {
    setFollowUpLead(lead);
    setFollowUpOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const name = pendingDelete.firmName;
    deleteLead.mutate(
      { id: pendingDelete.id },
      {
        onSuccess: () => {
          toast({ title: "Firm removed", description: `${name} was removed from the tracker.` });
          setPendingDelete(null);
        },
        onError: (err: any) =>
          toast({ title: "Could not delete", description: err.message, variant: "destructive" }),
      },
    );
  };

  // Exports always follow the filters on screen, so what you see is what you get.
  const runExport = (kind: "xls" | "csv") => {
    if (!visible.length) {
      toast({ title: "Nothing to export", description: "No firms match the current filters." });
      return;
    }
    if (kind === "xls") exportMeetLeadsToExcel(visible, true);
    else exportMeetLeadsToCsv(visible);
    toast({
      title: "Download started",
      description: `${visible.length} firm${visible.length > 1 ? "s" : ""} exported.`,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortBy("recent");
    setDueOnly(false);
  };

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (dueOnly ? 1 : 0) +
    (sortBy !== "recent" ? 1 : 0);

  const filtersActive =
    !!search || statusFilter !== "all" || typeFilter !== "all" || dueOnly || sortBy !== "recent";

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background wash */}
      <div className="fixed top-0 left-0 w-full h-[380px] bg-gradient-to-b from-primary/8 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-primary/8 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">

        {/* ---------------------------- Header ---------------------------- */}
        <header className="pt-8 sm:pt-14 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0 rotate-3">
                <Handshake className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-foreground">
                  Meet{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/55">
                    Tracker
                  </span>
                </h1>
                <span
                  title={isLive
                    ? "Connected - changes from any device appear here instantly"
                    : "Not connected - the list refreshes every 20 seconds instead"}
                  className={cn(
                    "inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border",
                    isLive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                      : "bg-muted text-muted-foreground border-border/70",
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isLive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50",
                  )} />
                  {isLive ? "Live" : "Syncing"}
                </span>

                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                  Every firm you call or visit, week by week - with the address, the map link,
                  the live status and a full trail of what was said on each call.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-11 rounded-xl px-3.5 border-border/60"
                aria-label="Refresh"
              >
                <RotateCcw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              </Button>

              <Link href="/meet-tracker/activity">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest px-4 border-border/60 relative"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Activity
                  {stats.updatesToday > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                      {stats.updatesToday}
                    </span>
                  )}
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest px-4 border-border/60"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest px-4 border-border/60">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                  <DropdownMenuLabel className="text-xs">
                    Exporting {visible.length} firm{visible.length === 1 ? "" : "s"}
                    {filtersActive ? " (filtered)" : ""}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runExport("xls")} className="gap-2 cursor-pointer py-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-sm">Excel (.xls)</div>
                      <div className="text-[11px] text-muted-foreground">Leads + full update history</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runExport("csv")} className="gap-2 cursor-pointer py-2.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <div>
                      <div className="font-semibold text-sm">CSV (.csv)</div>
                      <div className="text-[11px] text-muted-foreground">Plain list, for Google Sheets</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={openAdd}
                className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest px-5 shadow-lg shadow-primary/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Firm
              </Button>
            </div>
          </motion.div>
        </header>

        {/* ---------------------------- Stats ----------------------------- */}
        <button
          type="button"
          onClick={() => setStatsOpen((v) => !v)}
          aria-expanded={statsOpen}
          className="md:hidden w-full flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3.5 py-3 mb-3 shadow-sm"
        >
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-bold">{stats.total} firms</span>
          <span className="text-xs text-muted-foreground truncate">
            {stats.active} active - {stats.won} won
            {stats.overdue > 0 ? ` - ${stats.overdue} overdue` : ""}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground ml-auto shrink-0 transition-transform", statsOpen && "rotate-180")} />
        </button>

        <div className={cn(
          "grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6",
          statsOpen ? "grid" : "hidden md:grid",
        )}>
          <StatTile icon={Building2} label="Total Firms" value={stats.total} tone="default" />
          <StatTile icon={Flame} label="In Pipeline" value={stats.active} tone="primary" />
          <StatTile icon={CalendarClock} label="Meet Today" value={stats.dueToday} tone="amber"
            onClick={() => { setDueOnly(true); setStatusFilter("all"); }} />
          <StatTile icon={CalendarClock} label="Overdue" value={stats.overdue} tone="rose"
            onClick={() => { setDueOnly(true); setStatusFilter("all"); }} />
          <StatTile icon={Trophy} label="Won" value={stats.won} tone="emerald"
            onClick={() => setStatusFilter("won")} />
          <StatTile icon={PhoneCall} label="Total Updates" value={stats.updates} tone="violet" />
        </div>

        {/* ------------------------ Status quick bar ---------------------- */}
        {stats.total > 0 && (
          <div className="hidden md:flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setDueOnly(false); }}
              className={cn(
                "shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                statusFilter === "all" && !dueOnly
                  ? "bg-foreground text-background border-transparent shadow-md"
                  : "bg-card text-muted-foreground border-border/70 hover:border-primary/40",
              )}
            >
              All {stats.total}
            </button>
            {MEET_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => {
              const cfg = MEET_STATUS_CONFIG[s];
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(active ? "all" : s); setDueOnly(false); }}
                  className={cn(
                    "shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                    active ? `${cfg.pill} border-transparent shadow-md` : `${cfg.chip} hover:brightness-95`,
                  )}
                >
                  {cfg.emoji} {cfg.short} {statusCounts[s]}
                </button>
              );
            })}
          </div>
        )}

        {/* ---------------------------- Toolbar --------------------------- */}
        <div className="bg-card/70 backdrop-blur border border-border/60 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
          <div className="flex flex-col xl:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search firm, contact, phone, address..."
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-label="Open filters"
                className={cn(
                  "md:hidden relative shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center transition-colors",
                  activeFilterCount
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card text-muted-foreground border-border/70",
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 xl:flex gap-2.5">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-11 rounded-xl xl:w-[170px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-11 rounded-xl xl:w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {MEET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEET_STATUS_CONFIG[s].emoji} {MEET_STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-11 rounded-xl xl:w-[170px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="next_meet">Next meet date</SelectItem>
                  <SelectItem value="firm">Firm name (A-Z)</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="status">Pipeline stage</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={dueOnly ? "default" : "outline"}
                onClick={() => setDueOnly((v) => !v)}
                className="h-11 rounded-xl text-xs font-bold gap-1.5 px-3"
              >
                <CalendarClock className="w-4 h-4" />
                Due
              </Button>
            </div>

            <div className="flex gap-2.5">
              <div className="flex bg-muted rounded-xl p-1 h-11 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  aria-pressed={view === "card"}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all",
                    view === "card" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-pressed={view === "list"}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all",
                    view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {filtersActive && (
                <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-xl text-xs font-bold text-muted-foreground">
                  Clear
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 px-1">
            Showing <span className="font-bold text-foreground">{visible.length}</span> of {stats.total} firms
          </p>
        </div>

        {/* ---------------------------- Content --------------------------- */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-dashed border-border/60">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-5">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Could not load your firms</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Something went wrong reaching the database. Give it another try.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center bg-card rounded-[2rem] border border-dashed border-border/60"
          >
            <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center mb-6">
              <Handshake className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-3">
              {stats.total === 0 ? "No firms yet" : "Nothing matches those filters"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              {stats.total === 0
                ? "Add the first firm you plan to call. Track the address, map link and every status update in one place."
                : "Try a different week, status or search term."}
            </p>
            {stats.total === 0 ? (
              <Button onClick={openAdd} className="h-12 rounded-xl font-bold px-7 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Firm
              </Button>
            ) : (
              <Button onClick={resetFilters} variant="outline" className="h-12 rounded-xl font-bold px-7">
                Clear filters
              </Button>
            )}
          </motion.div>
        ) : view === "card" ? (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {visible.map((lead, i) => (
                <MeetLeadCard
                  key={lead.id}
                  lead={lead}
                  index={i}
                  onLogUpdate={openFollowUp}
                  onEdit={openEdit}
                  onDelete={setPendingDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <MeetLeadTable
            leads={visible}
            onLogUpdate={openFollowUp}
            onEdit={openEdit}
            onDelete={setPendingDelete}
          />
        )}
      </div>

      {/* ---------------------------- Modals ----------------------------- */}
      <MeetLeadModal
        open={leadModalOpen}
        onOpenChange={setLeadModalOpen}
        lead={editing}
        knownTypes={types}
        knownOwners={owners}
      />

      <FollowUpModal open={followUpOpen} onOpenChange={setFollowUpOpen} lead={followUpLead} />

      {/* Filters slide up from the bottom on phones. */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl p-0 max-h-[85vh] flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 text-left shrink-0">
            <span className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-border" />
            <SheetTitle className="text-lg font-display flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-auto text-xs font-bold text-muted-foreground">
                  {visible.length} of {stats.total}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left",
                    statusFilter === "all"
                      ? "bg-foreground text-background border-transparent"
                      : "bg-card text-muted-foreground border-border/70",
                  )}
                >
                  All {stats.total}
                </button>
                {MEET_STATUSES.filter((st) => statusCounts[st] > 0).map((st) => {
                  const scfg = MEET_STATUS_CONFIG[st];
                  const on = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(on ? "all" : st)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left truncate",
                        on ? `${scfg.pill} border-transparent` : scfg.chip,
                      )}
                    >
                      {scfg.emoji} {scfg.short} {statusCounts[st]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sort by</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="next_meet">Next meet date</SelectItem>
                  <SelectItem value="firm">Firm name (A-Z)</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="status">Pipeline stage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setDueOnly((v) => !v)}
              className={cn(
                "w-full flex items-center gap-2 px-4 h-12 rounded-xl border text-sm font-bold transition-all",
                dueOnly
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card text-muted-foreground border-border/70",
              )}
            >
              <CalendarClock className="w-4 h-4" />
              Only firms due today or overdue
            </button>
          </div>

          <div className="px-5 py-4 border-t border-border/60 bg-muted/30 flex gap-3 shrink-0">
            <Button variant="outline" onClick={resetFilters} disabled={!filtersActive} className="flex-1 h-12 rounded-xl font-bold">
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)} className="flex-1 h-12 rounded-xl font-bold">
              Show {visible.length}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ImportModal open={importOpen} onOpenChange={setImportOpen} existing={all} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this firm?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.firmName} and all {pendingDelete?.followUps?.length || 0} of its
              status updates will be removed from the tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteLead.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLead.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const TONES: Record<string, { wrap: string; icon: string; value: string }> = {
  default: { wrap: "border-border/60", icon: "bg-muted text-muted-foreground", value: "text-foreground" },
  primary: { wrap: "border-primary/25", icon: "bg-primary/12 text-primary", value: "text-primary" },
  amber: { wrap: "border-amber-300/50", icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", value: "text-amber-600 dark:text-amber-400" },
  rose: { wrap: "border-rose-300/50", icon: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300", value: "text-rose-600 dark:text-rose-400" },
  emerald: { wrap: "border-emerald-300/50", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", value: "text-emerald-600 dark:text-emerald-400" },
  violet: { wrap: "border-violet-300/50", icon: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300", value: "text-violet-600 dark:text-violet-400" },
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "default",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: keyof typeof TONES;
  onClick?: () => void;
}) {
  const t = TONES[tone] ?? TONES.default;
  const Wrapper: any = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "flex items-center gap-3 bg-card border rounded-2xl px-3.5 py-3 text-left shadow-sm transition-all",
        t.wrap,
        onClick && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
      )}
    >
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
    </Wrapper>
  );
}
