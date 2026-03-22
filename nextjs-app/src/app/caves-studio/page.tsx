"use client";

import { motion } from "framer-motion";
import { ClipboardList, Briefcase, SearchX, User, Clock, CheckCircle2, Palmtree, CalendarX, ArrowLeft } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CavesStudioTaskModal } from "@/components/CavesStudioTaskModal";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

import { useTeamTasks, useTeamMembers } from "@/hooks/use-tasks";
import { CreateMemberModal } from "@/components/CreateMemberModal";
import { type Task } from "@/shared/routes";

export default function CavesStudioDashboard() {
  const [mounted, setMounted] = useState(false);
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useTeamTasks();
  const { data: members = [], isLoading: membersLoading, isError: membersError } = useTeamMembers("Caves Studio");
  const { toast } = useToast();

  const isLoading = tasksLoading || membersLoading;
  const isError = tasksError || membersError;


  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter tasks specifically for "Caves Studio" and group by Assignee
  const groupedByAssignee = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    
    // Initialize groups with all known members
    members.forEach(m => {
      groups[m.name] = [];
    });

    if (!tasks) return groups;
    
    const studioTasks = (tasks as Task[]).filter(t => t.companyName === "Caves Studio" && !t.deletedAt);
    studioTasks.forEach(task => {
      const assigneeKey = task.assignee || "Unassigned";
      if (!groups[assigneeKey]) {
        groups[assigneeKey] = [];
      }
      groups[assigneeKey].push(task);
    });
    return groups;
  }, [tasks, members]);

  const assigneeEntries = useMemo(() => {
    const entries = Object.entries(groupedByAssignee);
    const memberNames = members.map(m => m.name);
    
    return entries.sort((a, b) => {
      // Members first, then unassigned
      const aIsMember = memberNames.includes(a[0]);
      const bIsMember = memberNames.includes(b[0]);
      
      if (aIsMember && !bIsMember) return -1;
      if (!aIsMember && bIsMember) return 1;
      
      return a[0].localeCompare(b[0]);
    });
  }, [groupedByAssignee, members]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="w-full h-[300px]" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-20 w-1/3 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <SearchX className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground">Failed to load tasks</h2>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const hasTasks = assigneeEntries.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      
      {/* Header */}
      <header className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tracker
              </Button>
            </Link>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-foreground text-balance leading-tight tracking-tight flex items-center gap-4">
              Caves Studio <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Team</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground/80 max-w-2xl">
              Track, assign, and manage tasks specifically for the Caves Studio team members.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CavesStudioTaskModal />
          </div>
        </motion.div>
      </header>

      {/* Main Board */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24 h-full">
        {!hasTasks ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-[2.5rem] border border-dashed border-border/60 shadow-sm mt-10"
          >
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <Briefcase className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-display font-bold text-foreground mb-3">No Team Tasks Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Start by assigning tasks to the members of the Caves Studio team.
            </p>
            <CavesStudioTaskModal />
          </motion.div>
        ) : (
          <div className="flex flex-nowrap gap-6 overflow-x-auto pb-8 pt-4 custom-scrollbar items-start min-h-[60vh]">
            {assigneeEntries.map(([assignee, memberTasks], idx) => {
              // Calculate completion metrics
              const total = memberTasks.length;
              const completed = memberTasks.filter((t: Task) => t.status === "completed").length;
              const progress = Math.round((completed / total) * 100) || 0;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={assignee} 
                  className="flex-shrink-0 w-[350px] sm:w-[400px] bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl flex flex-col h-fit max-h-[80vh]"
                >
                  <div className="p-5 border-b border-border/40 sticky top-0 bg-card/95 backdrop-blur-md rounded-t-2xl z-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-display font-bold flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        {assignee}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {total} TASKS
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          {progress}% done
                        </span>
                      </div>
                    </div>
                    <div>
                      {/* Action to add task directly to this member */}
                      <CavesStudioTaskModal memberName={assignee === "Unassigned" ? "" : assignee} />
                    </div>
                  </div>
                  
                  <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-3">
                    {memberTasks.sort((a: Task, b: Task) => new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime()).map((task: Task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const getStatusConfig = (status: string | null | undefined) => {
    switch (status) {
      case "completed": return { icon: CheckCircle2, class: "text-green-600 bg-green-50/50 border-green-200", label: "Completed" };
      case "holiday": return { icon: Palmtree, class: "text-purple-600 bg-purple-50/50 border-purple-200", label: "Holiday" };
      case "leave": return { icon: CalendarX, class: "text-rose-600 bg-rose-50/50 border-rose-200", label: "Leave" };
      default: return { icon: Clock, class: "text-amber-600 bg-amber-50/50 border-amber-200", label: "In Progress" };
    }
  };

  const statusConfig = getStatusConfig(task.status);
  const Icon = statusConfig.icon;

  const formattedDate = useMemo(() => {
    try {
      return format(parseISO(task.taskDate), "MMM d, yyyy");
    } catch {
      return task.taskDate;
    }
  }, [task.taskDate]);

  return (
    <div className="bg-background border border-border/40 hover:border-border p-4 rounded-xl shadow-sm transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border", statusConfig.class)}>
          <Icon className="w-3 h-3" />
          {statusConfig.label}
        </div>
        <div className="text-xs font-mono font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
          {formattedDate}
        </div>
      </div>
      
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mt-1">
        {task.description}
      </p>

      {task.proofLink && (
        <a 
          href={task.proofLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-xs text-primary hover:text-primary/80 font-medium"
        >
          View Proof &rarr;
        </a>
      )}
    </div>
  );
}
