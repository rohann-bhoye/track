"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  BarChart3, Building2, CheckCircle2, Clock, ArrowLeft,
  CalendarDays, ListChecks, TrendingUp, FileText, Lock
} from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { type Task } from "@/shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function safeFormat(dateStr: string | null | undefined, fmt: string) {
  if (!dateStr) return "N/A";
  try { return format(parseISO(dateStr), fmt); }
  catch { return dateStr; }
}

export default function ReportPage() {
  const [mounted, setMounted] = useState(false);
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);
  const [masterCode, setMasterCode] = useState("");
  const { data: tasks, isLoading, isError } = useTasks();
  const { toast } = useToast();
  // Handle mounting and session persistence (with 1-hour expiry)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("master_unlocked");
    const unlockTime = localStorage.getItem("master_unlock_time");
    
    if (saved === "true" && unlockTime) {
      const oneHour = 60 * 60 * 1000;
      const isExpired = Date.now() - parseInt(unlockTime) > oneHour;
      
      if (isExpired) {
        localStorage.removeItem("master_unlocked");
        localStorage.removeItem("master_unlock_time");
        setIsMasterUnlocked(false);
      } else {
        setIsMasterUnlocked(true);
      }
    }
  }, []);

  const handleUnlock = () => {
    if (masterCode === "task123") {
      setIsMasterUnlocked(true);
      localStorage.setItem("master_unlocked", "true");
      localStorage.setItem("master_unlock_time", Date.now().toString());
    } else {
      toast({ title: "Access Denied 🛑", description: "Nice try, hacker! But that's not the master code.", variant: "destructive" });
      setMasterCode("");
    }
  };

  const stats = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;
    const total = tasks.length;
    const completed = tasks.filter((t: Task) => t.status === "completed").length;
    const inProgress = total - completed;
    const companies = Array.from(new Set(tasks.map((t: Task) => t.companyName)));

    const byCompany: Record<string, { tasks: Task[]; completed: number; inProgress: number }> = {};
    tasks.forEach((t: Task) => {
      if (!byCompany[t.companyName]) byCompany[t.companyName] = { tasks: [], completed: 0, inProgress: 0 };
      byCompany[t.companyName].tasks.push(t);
      if (t.status === "completed") byCompany[t.companyName].completed++;
      else byCompany[t.companyName].inProgress++;
    });

    return { total, completed, inProgress, companies, byCompany };
  }, [tasks]);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!isMasterUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border/50 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2 rotate-3 hover:rotate-0 transition-transform duration-300">
              <BarChart3 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">Detailed Report</h1>
              <p className="text-muted-foreground text-sm max-w-[280px]">
                Enter your secure master code to view the professional report.
              </p>
            </div>
            
            <div className="w-full space-y-4 pt-4">
              <Input 
                type="password" 
                placeholder="Master Code" 
                className="text-center text-lg sm:text-2xl tracking-[0.2em] sm:tracking-[0.5em] h-16 rounded-2xl border-primary/20 focus:border-primary/50 bg-muted/30"
                value={masterCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMasterCode(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleUnlock()}
              />
              <Button 
                onClick={handleUnlock}
                className="w-full h-14 font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
              >
                View Report
                <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
// ... existing loader code ...
    return (
      <div className="min-h-screen bg-background max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        {[1,2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <FileText className="w-14 h-14 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold text-foreground">No report data available</h2>
        <p className="text-muted-foreground">Add some tasks first to see your report.</p>
        <Link href="/">
          <button className="mt-4 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">
            Go to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  const completionRate = Math.round((stats.completed / stats.total) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Back Button + Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <BarChart3 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Detailed Report</h1>
              <p className="text-muted-foreground mt-1 text-sm">Overview of your work across all companies</p>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
        >
          {[
            { icon: <ListChecks className="w-5 h-5" />, label: "Total Tasks", value: stats.total, color: "text-primary" },
            { icon: <CheckCircle2 className="w-5 h-5" />, label: "Completed", value: stats.completed, color: "text-green-600" },
            { icon: <Clock className="w-5 h-5" />, label: "In Progress", value: stats.inProgress, color: "text-amber-600" },
            { icon: <Building2 className="w-5 h-5" />, label: "Companies", value: stats.companies.length, color: "text-blue-600" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}>
              <Card className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className={cn("mb-3", s.color)}>{s.icon}</div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Overall Completion Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="mb-8 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-primary" />
                Overall Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-muted-foreground">{stats.completed} of {stats.total} tasks done</span>
                <span className="text-primary font-mono">{completionRate}%</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Per-Company Breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company Breakdown
          </h2>
          <div className="space-y-4">
            {Object.entries(stats.byCompany)
              .sort((a, b) => b[1].tasks.length - a[1].tasks.length)
              .map(([company, data], idx) => {
                const rate = Math.round((data.completed / data.tasks.length) * 100);
                const latestTask = data.tasks[0];
                return (
                  <motion.div key={company} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + idx * 0.08 }}>
                    <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground truncate">{company}</h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3" />
                                  Joined {safeFormat(latestTask?.dateOfJoin, "MMM yyyy")}
                                </span>
                                <span className="text-xs text-muted-foreground">{data.tasks.length} tasks</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant="outline" className={cn(
                              "rounded-full font-bold px-3",
                              data.inProgress > 0 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-green-50 text-green-600 border-green-200"
                            )}>
                              {data.inProgress > 0 ? `${data.inProgress} active` : "All done"}
                            </Badge>
                            <Link href={`/company/${encodeURIComponent(company)}`}>
                              <button className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">View →</button>
                            </Link>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between text-xs font-medium mb-1.5">
                            <span className="text-muted-foreground">{data.completed}/{data.tasks.length} completed</span>
                            <span className="text-primary font-mono">{rate}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${rate}%` }}
                              transition={{ duration: 1, delay: 0.6 + idx * 0.1 }}
                              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
