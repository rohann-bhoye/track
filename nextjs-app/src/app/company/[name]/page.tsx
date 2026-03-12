"use client";

import { useMemo, useState, useEffect } from "react";
import { format, parseISO, isValid, isSunday, eachDayOfInterval, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const safeFormatDate = (dateOrString: any, formatStr: string) => {
  if (!dateOrString) return "N/A";
  let date: Date;
  if (typeof dateOrString === "string") {
    date = parseISO(dateOrString);
  } else {
    date = dateOrString;
  }
  return isValid(date) ? format(date, formatStr) : dateOrString;
};
import {
  ArrowLeft,
  Calendar,
  History,
  Building2,
  Clock,
  MoreVertical,
  CheckCircle2,
  PlayCircle,
  GripVertical,
  LayoutList,
  FileText,
  Pencil,
  Lock,
  Loader2,
  CalendarDays,
  ExternalLink,
  Trash2,
  Trash,
  Palmtree,
  CalendarX,
  Sun,
  Share2,
  Ghost,
  ShieldAlert
} from "lucide-react";

import { useTasks, useUpdateTask, useVerifyCode, useDeleteTask } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateTaskStatusSchema, type Task } from "@/shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CompanyDetail() {
  const params = useParams();
  const name = params?.name ? decodeURIComponent(params.name as string) : "";
  const { data: allTasks, isLoading } = useTasks(name);
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const verifyCode = useVerifyCode();
  const deleteTask = useDeleteTask();

  const [mounted, setMounted] = useState(false);
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);

  // Helper to get company slug (mirrors server logic)
  const getSlug = (str: string) => {
    const secret = "rohan-secret-2024";
    const combined = secret + str;
    let hex = "";
    for (let i = 0; i < combined.length; i++) {
      hex += combined.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex.substring(10, 22).toLowerCase();
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("master_unlocked");
    const unlockTime = localStorage.getItem("master_unlock_time");
    if (saved === "true" && unlockTime) {
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - parseInt(unlockTime) < oneHour) {
        setIsMasterUnlocked(true);
      }
    }
  }, []);



  const handleShare = () => {
    if (typeof window !== "undefined") {
      const slug = getSlug(name);
      // If we are already on a slug-based URL, just copy it
      // but to be safe, compute from the current company name
      const activeName = companyTasks.length > 0 ? companyTasks[0].companyName : name;
      const targetSlug = getSlug(activeName);
      const url = `${window.location.origin}/company/${targetSlug}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Secret Link Copied",
        description: "A private link has been copied. Rohan's vault is secure!",
      });
    }
  };

  const companyTasks = useMemo(() => {
    if (!allTasks) return [];
    const target = name.toLowerCase();
    return allTasks.filter((t: Task) => {
      const cName = t.companyName.toLowerCase();
      const cSlug = getSlug(t.companyName).toLowerCase();
      return cName === target || cSlug === target;
    }).sort((a: Task, b: Task) => new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime());
  }, [allTasks, name]);

  const companyInfo = useMemo(() => companyTasks[0], [companyTasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    companyTasks.forEach((task: Task) => {
      if (!groups[task.taskDate]) {
        groups[task.taskDate] = [];
      }
      groups[task.taskDate].push(task);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [companyTasks]);
  
  const allDaysWithSundays = useMemo(() => {
    if (!companyTasks) return groupedTasks;
    
    const start = companyInfo?.dateOfJoin ? parseISO(companyInfo.dateOfJoin) : 
                 (companyTasks.length > 0 ? new Date(Math.min(...companyTasks.map(t => new Date(t.taskDate).getTime()))) : new Date());
    const end = startOfDay(new Date());
    
    if (!isValid(start)) return groupedTasks;
    
    const allSundays = eachDayOfInterval({ start, end }).filter(date => isSunday(date));
    const groups: Record<string, Task[]> = {};
    
    // Add existing tasks
    companyTasks.forEach((task: Task) => {
      const dateStr = task.taskDate;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(task);

      // If task has an originalDate, also add a "ghost" of it to that date group
      if (task.originalDate && task.originalDate !== task.taskDate) {
        if (!groups[task.originalDate]) groups[task.originalDate] = [];
        groups[task.originalDate].push({
          ...task,
          id: `ghost-${task.id}`,
          isGhost: true
        } as any);
      }
    });
    
    // Inject Sundays if missing
    allSundays.forEach(sunday => {
      const dateStr = format(sunday, "yyyy-MM-dd");
      if (!groups[dateStr]) {
        groups[dateStr] = [{
          id: `sunday-${dateStr}`,
          companyName: name,
          taskDate: dateStr,
          description: "Weekly Holiday",
          status: "holiday",
          dateOfJoin: companyInfo?.dateOfJoin || "",
          createdAt: sunday,
          completedAt: sunday
        } as Task];
      }
    });
    
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [companyTasks, groupedTasks, companyInfo, name]);

  const activeCompanyName = useMemo(() => 
    companyTasks.length > 0 ? companyTasks[0].companyName : null
  , [companyTasks]);

  const isUsingSlug = useMemo(() => 
    activeCompanyName ? getSlug(activeCompanyName) === name.toLowerCase() : false
  , [activeCompanyName, name]);

  useEffect(() => {
    if (activeCompanyName) {
      document.title = `${activeCompanyName} | Work Tracker`;
    }
  }, [activeCompanyName]);

  const editForm = useForm({
    resolver: zodResolver(updateTaskStatusSchema),
    defaultValues: {
      status: "in_progress",
      startDate: "",
      endDate: "",
      taskDate: "",
      description: "",
      proofLink: "",
      secretCode: "",
    },
  });

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      status: (task.status as any) || "in_progress",
      startDate: task.startDate || "",
      endDate: task.endDate || "",
      taskDate: task.taskDate || "",
      description: task.description || "",
      proofLink: (task as any).proofLink || "",
      secretCode: "",
    });
    setIsAuthorized(false);
    setAuthCode("");
  };

  const onUpdate = (values: any) => {
    if (!editingTask) return;

    updateTask.mutate({
      id: editingTask.id,
      updates: {
        status: values.status,
        startDate: values.startDate,
        endDate: values.endDate,
        taskDate: values.taskDate,
        description: values.description,
        proofLink: values.proofLink,
      },
      secretCode: values.secretCode,
    }, {
      onSuccess: () => {
        toast({ title: "Task Updated", description: "The task has been updated successfully." });
        setEditingTask(null);
      },
      onError: (err: any) => {
        toast({ title: "Update Failed 💥", description: err.message || "Oops! The database blinked. Try again!", variant: "destructive" });
      }
    });
  };

  const handleDeleteTask = (task: Task) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    
    // We need the secret code for deletion too
    const code = prompt("Enter secure code to delete:");
    if (!code) return;

    deleteTask.mutate({ id: task.id, secretCode: code }, {
      onSuccess: () => {
        toast({ title: "Task Deleted", description: "The task has been removed." });
      },
      onError: (err: any) => {
        toast({ title: "Delete Failed 💥", description: err.message || "Whoops, couldn't delete that. The ghost of the task remains!", variant: "destructive" });
      }
    });
  };

  if (isLoading || !mounted) return <DetailSkeleton />;

  
  
  // Joke message for unauthorized name access
  if (!isMasterUnlocked && !isUsingSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8 bg-card border border-border/50 p-12 rounded-[2.5rem] shadow-2xl relative"
        >
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary rotate-12">
              <Ghost className="w-12 h-12" />
            </div>
            <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold text-foreground">Caught you! 🕵️‍♂️</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Nice try guessing the company name, but this vault is for VIPs only.
            </p>
            <div className="bg-muted/50 p-6 rounded-2xl border border-dashed border-primary/20">
              <p className="text-sm font-medium text-primary italic leading-relaxed">
                "Wait, are you a spy? 🕵️‍♀️ Or just lost? Either way, you need a **Secret Link** or the **Master Code** to see what's in here!"
              </p>
            </div>
          </div>

          <Link href="/" className="block">
            <Button className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20">
              Take me back to safety
            </Button>
          </Link>
          
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-40 font-bold">
            BucketStudy Secure-Link System v2.0
          </p>
        </motion.div>
      </div>
    );
  }

  // If we got here but have no tasks (invalid slug/name), show standard error
  if (companyTasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-sm px-6">
          <Ghost className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display">No tasks found</h2>
            <p className="text-muted-foreground">This link doesn't seem to lead anywhere special. Are you sure Rohan sent you this? 🕵️‍♀️</p>
          </div>
          <Link href="/" className="block pt-4">
            <Button variant="outline" className="rounded-xl px-10">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      
      <header className="pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Button>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          }}
        >
          {/* Animated Ocean Waves */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
            <div className="absolute bottom-0 left-0 w-[200%] h-[120px] animate-wave-slow">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-blue-400/20">
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
              </svg>
            </div>
            <div className="absolute bottom-0 left-[-50%] w-[200%] h-[100px] animate-wave-medium">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-blue-300/10">
                <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,54.7,103.42,60.53,40.88,5.79,82.35-12.47,118.55-31.7,38.2-20.28,73.43-42.82,116.88-51.72C1108.68,1.25,1176.43,19,1200,31.58V0Z"></path>
              </svg>
            </div>
            <div className="absolute bottom-[-10px] left-0 w-[200%] h-[80px] animate-wave-fast">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-white/10">
                <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
              </svg>
            </div>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 w-full">
            <div className="space-y-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="p-3.5 sm:p-5 bg-blue-500/20 text-blue-100 rounded-[1.25rem] sm:rounded-[1.5rem] backdrop-blur-md border border-white/10 shadow-xl"
                >
                  <Building2 className="w-7 h-7 sm:w-10 h-10" />
                </motion.div>
                <div>
                  <h1 className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-tight drop-shadow-sm leading-tight">
                    {activeCompanyName || name}
                  </h1>
                  <div className="flex gap-5 mt-2 text-blue-200/80">
                    <span className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Joined {companyInfo?.dateOfJoin ? safeFormatDate(companyInfo.dateOfJoin, "MMM d, yyyy") : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-4 w-full sm:w-auto mt-6 md:mt-0">
              <Button 
                onClick={handleShare}
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-black group px-8 py-6 h-auto backdrop-blur-md transition-all hover:scale-105"
              >
                <Share2 className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                Share Link
              </Button>
              <Badge variant="secondary" className="px-5 py-2 text-sm font-black rounded-full border-blue-400/20 bg-blue-400/10 text-blue-100 backdrop-blur-sm self-start sm:self-auto">
                <History className="w-4 h-4 mr-2 text-blue-400" />
                {companyTasks.length} Total Tasks
              </Badge>
            </div>
          </div>
        </motion.div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8">
        <div className="space-y-12">
          {allDaysWithSundays.map(([date, tasks], groupIdx) => (
            <motion.section 
              key={date}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: groupIdx * 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted border border-border/50 flex items-center justify-center font-display font-bold text-lg text-foreground shadow-sm">
                  {safeFormatDate(date, "dd")}
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {safeFormatDate(date, "MMMM yyyy")}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {safeFormatDate(date, "EEEE")} {isSunday(parseISO(date)) && <span className="text-purple-500 font-bold ml-1">• Holiday</span>} • {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
                  </p>
                </div>
                <div className="flex-grow h-[1px] bg-gradient-to-r from-border/50 to-transparent ml-4" />
              </div>

              <div className="grid gap-4 ml-0 sm:ml-14">
                {tasks.map((task) => (
                  <Card key={task.id} className={cn(
                    "group border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md bg-card/50 backdrop-blur-sm relative overflow-hidden",
                    (task as any).isGhost && "border-dashed border-slate-200 bg-slate-50/30"
                  )}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6">
                        <div className="space-y-4 flex-grow">
                          <div className="flex flex-wrap gap-3">
                            {(task as any).isGhost ? (
                              <Badge className="font-semibold rounded-lg px-2.5 py-1 bg-slate-100 text-slate-500 border-slate-200">
                                <History className="w-3.5 h-3.5 mr-1.5" />
                                Shifted
                              </Badge>
                            ) : (
                              <Badge className={cn(
                                "font-semibold rounded-lg px-2.5 py-1",
                                task.status === "completed" 
                                  ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100" 
                                  : task.status === "holiday"
                                  ? "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100"
                                  : task.status === "leave"
                                  ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                              )}>
                                {task.status === "completed" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                ) : task.status === "holiday" ? (
                                  <Palmtree className="w-3.5 h-3.5 mr-1.5" />
                                ) : task.status === "leave" ? (
                                  <CalendarX className="w-3.5 h-3.5 mr-1.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {task.status === "completed" ? "Completed" : 
                                 task.status === "holiday" ? "Holiday" :
                                 task.status === "leave" ? "Leave" : "In Progress"}
                              </Badge>
                            )}

                             {task.createdAt && (
                               <Badge variant="outline" className="rounded-lg bg-background/50 border-border px-2.5 py-1 text-muted-foreground flex items-center gap-1.5">
                                 <Clock className="w-3.5 h-3.5" />
                                 Logged: {safeFormatDate(task.createdAt, "MMM d, h:mm a")}
                               </Badge>
                             )}

                             {task.completedAt && (
                               <Badge variant="outline" className="rounded-lg bg-background/50 border-border px-2.5 py-1 text-muted-foreground flex items-center gap-1.5">
                                 <CheckCircle2 className="w-3.5 h-3.5" />
                                 Completed: {safeFormatDate(task.completedAt, "MMM d, h:mm a")}
                               </Badge>
                             )}

                             {task.originalDate && (
                               <Badge variant="outline" className="rounded-lg bg-amber-50 border-amber-200 px-2.5 py-1 text-amber-700 flex items-center gap-1.5 font-bold shadow-sm">
                                 <History className="w-3.5 h-3.5" />
                                 Comes from: {safeFormatDate(task.originalDate, "MMM d")}
                               </Badge>
                             )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <p className={cn(
                              "text-foreground text-sm leading-relaxed whitespace-pre-wrap",
                              (task as any).isGhost && "opacity-60 italic"
                            )}>
                              {task.description}
                            </p>
                            {(task as any).isGhost && (
                              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                                <ArrowLeft className="w-3 h-3" />
                                This task was shifted to {safeFormatDate(task.taskDate, "MMM d, yyyy")} for completion.
                              </p>
                            )}
                          </div>

                          {(task as any).proofLink && (
                            <div className="flex gap-3 pt-2">
                              <ExternalLink className="w-4 h-4 text-primary mt-1 shrink-0" />
                              <a 
                                href={(task as any).proofLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary text-sm font-medium hover:underline flex items-center gap-1.5"
                              >
                                View Proof of Work
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-start">
                          {!(task as any).isGhost && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditClick(task)}
                                className="rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteTask(task)}
                                className="rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </main>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          {!isAuthorized ? (
            <div className="p-10 flex flex-col items-center justify-center space-y-6">
              <div className="bg-primary/10 p-4 rounded-full">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <DialogTitle className="text-2xl font-display">Authorize Edit</DialogTitle>
                <DialogDescription>
                  Enter the secure code to unlock the modification form.
                </DialogDescription>
              </div>
              <div className="w-full max-w-[320px] space-y-4 pt-4">
                <Input 
                  type="password" 
                  placeholder="Secure Code" 
                  className="text-center text-xl tracking-[0.5em] font-mono h-14 rounded-2xl border-primary/20 focus:border-primary/50"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && authCode) {
                      verifyCode.mutate(authCode, {
                        onSuccess: () => {
                          setIsAuthorized(true);
                          toast({ title: "Unlocked", description: "Form is now editable." });
                        },
                        onError: (error: Error) => {
                          toast({ title: "Access Denied 🛑", description: error.message || "Invalid code! Are you guessing randomly?", variant: "destructive" });
                          setAuthCode("");
                        }
                      });
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    if (authCode === "task123") {
                      setIsAuthorized(true);
                      toast({ title: "Unlocked", description: "Form is now editable." });
                    } else {
                      toast({ title: "Access Denied 🛑", description: "Invalid code! Are you guessing randomly?", variant: "destructive" });
                      setAuthCode("");
                    }
                  }} 
                  className="w-full h-12 font-bold text-lg rounded-2xl shadow-lg shadow-primary/20"
                >
                  Unlock Form
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setEditingTask(null)} className="text-muted-foreground">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-primary/10 px-8 py-6 border-b border-primary/10">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display flex items-center gap-2">
                    <History className="w-6 h-6 text-primary" />
                    Refine Task Status
                  </DialogTitle>
                  <DialogDescription>
                    Update the completion status and targeted end date only.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-8">
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onUpdate)} className="space-y-6">
                    {/* Read-only Information */}
                    <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Log Date: {safeFormatDate(editingTask?.createdAt, "MMM d, h:mm a")}
                        </span>
                        {editingTask?.completedAt && (
                          <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Finished: {safeFormatDate(editingTask?.completedAt, "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                      <div className="pt-2 border-t border-border/40">
                        <p className="text-sm font-medium text-foreground line-clamp-2 italic opacity-70">
                          "{editingTask?.description}"
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={editForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground/80 font-bold">Progress Status</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "completed") {
                                  editForm.setValue("endDate", format(new Date(), "yyyy-MM-dd"));
                                } else if (value === "in_progress") {
                                  editForm.setValue("endDate", "");
                                }
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-2xl h-12 border-primary/20 font-semibold focus:ring-primary/20">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-2xl">
                                <SelectItem value="in_progress" className="text-amber-600 font-medium">In Progress</SelectItem>
                                <SelectItem value="completed" className="text-green-600 font-medium">Completed</SelectItem>
                                <SelectItem value="holiday" className="text-purple-600 font-medium">Holiday</SelectItem>
                                <SelectItem value="leave" className="text-rose-600 font-medium">Leave</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground/80 font-bold">End/Completion Date</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input 
                                  type="date" 
                                  readOnly
                                  {...field} 
                                  className="rounded-2xl h-12 border-primary/20 pl-11 focus:ring-primary/20 bg-muted/50 cursor-not-allowed opacity-70" 
                                />
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="proofLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground/80 font-bold">Proof Link (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input 
                                  placeholder="https://..." 
                                  {...field} 
                                  className="rounded-2xl h-12 border-primary/20 pl-11 focus:ring-primary/20" 
                                />
                                <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Secret code is still needed for the mutation as per existing server route logic */}
                    <FormField
                      control={editForm.control}
                      name="secretCode"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                      <Button type="button" variant="ghost" onClick={() => setEditingTask(null)} className="rounded-xl px-6">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateTask.isPending} 
                        className="rounded-2xl h-12 px-10 font-bold shadow-xl shadow-primary/20"
                        onMouseEnter={() => editForm.setValue("secretCode", "task123")} // Pre-fill once authorized to match server schema
                      >
                        {updateTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Apply Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 space-y-12">
      <div className="h-[200px] bg-muted rounded-3xl animate-pulse" />
      <div className="space-y-8">
        {[1, 2].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-32 w-full rounded-2xl ml-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
