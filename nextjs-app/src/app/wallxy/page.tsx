"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, CheckCircle2, Inbox, SearchX, Loader2, 
  Image as ImageIcon, ExternalLink, Plus, UserPlus,
  UploadCloud, Sparkles, Eye, EyeOff, Zap, X, UserMinus, Trash2,
  LayoutGrid, List as ListIcon, Filter, Calendar, Search, ArrowUpAz, ArrowDownAz
} from "lucide-react";
import { 
  useWallxyTasks, useUpdateWallxyTask, useTeamMembers, 
  useCreateWallxyTask, useDeleteTeamMember, useDeleteWallxyTask
} from "@/hooks/use-tasks";
import { type Task } from "@/shared/schema";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";
import { CreateMemberModal } from "@/components/CreateMemberModal";

export default function WallxyDashboard() {
  const { data: tasks, isLoading, isError } = useWallxyTasks();
  const { data: membersObj } = useTeamMembers("Wallxy");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [pendingProofLink, setPendingProofLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [memberToDelete, setMemberToDelete] = useState<{id: string, name: string} | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleMagicUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please drop an image.", variant: "destructive" });
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ title: "Error", description: "Upload not configured.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      setUploadProgress(30);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      setUploadProgress(100);
      const data = await response.json();
      setPendingProofLink(data.secure_url);
      setIsCreateModalOpen(true);
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };
  
  // Merge members from database with anyone who already has a task
  const members = useMemo(() => {
    const list = new Set<string>();
    
    if (membersObj) {
      membersObj.forEach(m => list.add(m.name));
    }
    
    tasks?.forEach(t => {
      if (t.assignee) list.add(t.assignee);
    });
    
    return Array.from(list).sort();
  }, [membersObj, tasks]);

  const { unassigned, assigned, reviewTasks, stats } = useMemo(() => {
    if (!tasks) return { unassigned: [], assigned: {} as Record<string, Task[]>, reviewTasks: [], stats: { total: 0, filtered: 0 } };
    
    // Apply Filters
    let filtered = [...tasks];
    
    if (filterPriority !== "all") {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    
    if (filterDate !== "all") {
      const today = new Date();
      filtered = filtered.filter(t => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt);
        if (filterDate === "today") return format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        if (filterDate === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          return d >= weekAgo;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(q) || 
        t.assignee?.toLowerCase().includes(q)
      );
    }

    // Sort all tasks by createdAt ascending (oldest first)
    const sortedTasks = filtered.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const un = sortedTasks.filter(t => !t.assignee && t.status !== "completed" && t.status !== "review");
    const rev = sortedTasks.filter(t => t.status === "review");
    
    const ass = members.reduce((acc, m) => {
      acc[m] = sortedTasks.filter(t => t.assignee === m);
      return acc;
    }, {} as Record<string, Task[]>);

    return { 
      unassigned: un, 
      assigned: ass, 
      reviewTasks: rev,
      stats: { total: tasks.length, filtered: sortedTasks.length }
    };
  }, [tasks, members, filterPriority, filterDate, searchQuery]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-display text-lg tracking-wide">Loading Wallxy Board...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="text-center">
          <SearchX className="h-12 w-12 text-destructive mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold font-display text-foreground">Failed to load tasks</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center text-foreground font-sans selection:bg-primary/30">
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />

      <header className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="text-sm font-semibold tracking-widest text-primary uppercase">Live Task Assigner</span>
        </motion.div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-foreground tracking-tight drop-shadow-sm">
          Wallxy <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Board</span>
        </h1>
      </header>

      <main 
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingBoard(true);
        }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10"
      >
        <AnimatePresence>
          {isDraggingBoard && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragLeave={() => setIsDraggingBoard(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingBoard(false);
                if (e.dataTransfer.files?.length) handleMagicUpload(e.dataTransfer.files[0]);
              }}
              className="fixed inset-0 z-[100] bg-primary/10 backdrop-blur-sm flex items-center justify-center p-8 pointer-events-auto"
            >
              <div className="w-full max-w-2xl border-2 border-dashed border-primary/40 rounded-[3rem] bg-card/60 flex flex-col items-center justify-center p-12 text-center space-y-4 shadow-2xl">
                <UploadCloud className="w-12 h-12 text-primary animate-bounce" />
                <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">Drop to create task</h2>
              </div>
            </motion.div>
          )}

          {isUploading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[110] bg-card border border-border/50 rounded-2xl p-4 sm:p-6 shadow-2xl flex items-center gap-4 sm:gap-6 min-w-[250px] sm:min-w-[300px]"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold">Uploading Discreetly...</p>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex flex-col items-center w-full relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full bg-card border border-border/50 shadow-sm rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 z-10 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 border-b border-border/50 pb-5">
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <Inbox className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                Task List
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                <div className="h-12 flex items-center px-5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest min-w-[100px] justify-center">
                  {stats.filtered} / {stats.total} Tasks
                </div>
                <CreateMemberModal companyName="Wallxy" />
                <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> New Task
                </Button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between bg-muted/20 p-4 rounded-[1.5rem] border border-border/40">
              <div className="relative w-full md:w-72 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search tasks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-11 rounded-xl border-muted-foreground/20 focus:border-primary/50 bg-background/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
                <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-xl p-1 shadow-sm shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewMode("grid")}
                    className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "grid" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewMode("list")}
                    className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "list" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted")}
                  >
                    <ListIcon className="w-4 h-4" />
                  </Button>
                </div>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[130px] h-11 rounded-xl border-muted-foreground/20 bg-background/50">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 opacity-60" />
                      <SelectValue placeholder="Priority" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="easy">Easy Priority</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="w-[140px] h-11 rounded-xl border-muted-foreground/20 bg-background/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 opacity-60" />
                      <SelectValue placeholder="Date" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                  </SelectContent>
                </Select>

                {(filterPriority !== "all" || filterDate !== "all" || searchQuery) && (
                  <Button 
                    variant="ghost" 
                    onClick={() => { setFilterPriority("all"); setFilterDate("all"); setSearchQuery(""); }}
                    className="h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
            
            <TaskGrid 
              tasks={unassigned} 
              onSelect={setSelectedTask} 
              viewMode={viewMode}
              emptyText={stats.total > 0 ? "No tasks match your filters!" : "All tasks are assigned!"} 
              onDropFile={handleMagicUpload}
              onDeleteTask={setTaskToDelete}
            />
          </motion.div>

          {/* This spacer creates the line effect on desktop but stacks clearly on mobile */}
          <div className="hidden min-[1200px]:block w-full h-[80px] relative pointer-events-none opacity-40">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {members.map((_, i) => {
                const startX = "50%";
                const startY = "0";
                const sectionWidth = 100 / members.length;
                const endX = `${(i * sectionWidth) + (sectionWidth / 2)}%`;
                return (
                  <path 
                    key={i}
                    d={`M ${startX} ${startY} C ${startX} 60, ${endX} 40, ${endX} 100`}
                    fill="transparent"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeDasharray="8,8"
                    className="opacity-30"
                  />
                )
              })}
            </svg>
          </div>
          
          <div className="h-10 md:h-16 lg:hidden" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full gap-4 sm:gap-6 z-10">
            {members.map((member, i) => {
              const memberTasks = assigned[member] || [];
              const completedCount = memberTasks.filter(t => t.status === "completed").length;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={member}
                  className="w-full bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-black text-xl">
                        {member.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{member}</h3>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">Member</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {membersObj?.find(m => m.name.toLowerCase() === member.toLowerCase()) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const m = membersObj.find(dbM => dbM.name.toLowerCase() === member.toLowerCase());
                            if (m) setMemberToDelete({ id: m.id, name: m.name });
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="bg-muted/30 border border-border/50 px-4 py-2 rounded-xl text-center">
                        <div className="text-xl font-black font-mono text-primary">{completedCount}<span className="text-muted-foreground">/{memberTasks.length}</span></div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Score</p>
                      </div>
                    </div>
                  </div>
                  <TaskGrid 
                    tasks={memberTasks} 
                    onSelect={setSelectedTask} 
                    compact 
                    viewMode={viewMode}
                    emptyText="No tasks assigned" 
                    onDropFile={handleMagicUpload} 
                    onDeleteTask={setTaskToDelete}
                  />
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center w-full relative mt-12">
          {reviewTasks.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-500/30 shadow-lg rounded-[2.5rem] p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-500/20">
                <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6" /> Pending Review
                </h2>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-xl font-mono">
                  {reviewTasks.length} Ready
                </Badge>
              </div>
              <TaskGrid 
                tasks={reviewTasks} 
                onSelect={setSelectedTask} 
                viewMode={viewMode}
                emptyText="No tasks in review" 
                onDropFile={handleMagicUpload} 
                onDeleteTask={setTaskToDelete}
              />
            </motion.div>
          )}
        </div>
      </main>

      {selectedTask && <TaskModal task={selectedTask} members={members} onClose={() => setSelectedTask(null)} />}
      
      {isCreateModalOpen && (
        <CreateTaskModal 
          initialProofLink={pendingProofLink}
          onClose={() => {
            setIsCreateModalOpen(false);
            setPendingProofLink("");
          }} 
        />
      )}

      {memberToDelete && (
        <DeleteMemberDialog 
          member={memberToDelete} 
          onClose={() => setMemberToDelete(null)} 
        />
      )}

      {taskToDelete && (
        <DeleteTaskDialog 
          task={taskToDelete} 
          onClose={() => setTaskToDelete(null)} 
        />
      )}
    </div>
  );
}

function DeleteMemberDialog({ member, onClose }: { member: {id: string, name: string}, onClose: () => void }) {
  const deleteMember = useDeleteTeamMember();
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!code) return;
    deleteMember.mutate({ id: member.id, secretCode: code }, {
      onSuccess: () => {
        toast({ title: "Member Removed", description: `${member.name} has been deleted.` });
        onClose();
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-border/50 bg-card p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold">Remove {member.name}?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">This will permanently remove them from the board. Enter master code to confirm.</p>
          </div>
          <Input 
            type="password" 
            placeholder="Enter Master Code" 
            value={code} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
            className="h-12 rounded-xl text-center font-bold tracking-widest"
          />
          <div className="flex w-full gap-3 pt-2">
            <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold" onClick={onClose}>Cancel</Button>
            <Button 
              disabled={!code || deleteMember.isPending}
              className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold"
              onClick={handleConfirm}
            >
              {deleteMember.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTaskDialog({ task, onClose }: { task: Task, onClose: () => void }) {
  const deleteTask = useDeleteWallxyTask();
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!code) return;
    deleteTask.mutate({ id: task.id, secretCode: code }, {
      onSuccess: () => {
        toast({ title: "Task Removed 🔐", description: "Master Code Accepted. Evidence Deleted! 🕵️‍♂️" });
        onClose();
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-border/50 bg-card p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold">Delete Task?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">This will permanently remove this task from the board. Enter master code to confirm.</p>
          </div>
          <Input 
            type="password" 
            placeholder="Enter Master Code" 
            value={code} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
            className="h-12 rounded-xl text-center font-bold tracking-widest"
          />
          <div className="flex w-full gap-3 pt-2">
            <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold" onClick={onClose}>Cancel</Button>
            <Button 
              disabled={!code || deleteTask.isPending}
              className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold"
              onClick={handleConfirm}
            >
              {deleteTask.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskGrid({ 
  tasks, onSelect, compact = false, emptyText, onDropFile, onDeleteTask, viewMode = "grid"
}: { 
  tasks: Task[], onSelect: (t: Task) => void, compact?: boolean, emptyText: string, onDropFile?: (file: File) => void, onDeleteTask?: (t: Task) => void, viewMode?: "grid" | "list"
}) {
  const [isHoverDragging, setIsHoverDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (tasks.length === 0) {
    return (
      <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsHoverDragging(true); }}
        onDragLeave={() => setIsHoverDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsHoverDragging(false);
          if (e.dataTransfer.files?.length && onDropFile) {
            onDropFile(e.dataTransfer.files[0]);
          }
        }}
        className={cn(
          "py-16 px-6 text-center border-2 border-dashed rounded-[2rem] transition-all h-full flex flex-col items-center justify-center relative overflow-hidden group",
          isHoverDragging 
            ? "bg-primary/10 border-primary/50 scale-[1.01] shadow-inner" 
            : "bg-muted/10 border-border/40 hover:bg-muted/20 hover:border-border/60"
        )}
      >
        <div className={cn(
          "w-16 h-16 rounded-3xl mb-4 flex items-center justify-center transition-all duration-500",
          isHoverDragging ? "bg-primary text-primary-foreground rotate-12 scale-110" : "bg-background shadow-sm text-muted-foreground group-hover:scale-105"
        )}>
          {isHoverDragging ? <Zap className="w-8 h-8" /> : <Sparkles className="w-8 h-8 opacity-40" />}
        </div>
        
        <p className={cn(
          "text-[15px] font-bold transition-colors tracking-tight",
          isHoverDragging ? "text-primary" : "text-muted-foreground/60"
        )}>
          {isHoverDragging ? "Drop to create magic!" : emptyText}
        </p>
        
        {!isHoverDragging && (
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/30 mt-2">
            Magic Drop Active
          </p>
        )}

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-12 h-12 bg-primary/5 rounded-full blur-xl" />
        <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-12 h-12 bg-primary/5 rounded-full blur-xl" />
      </div>
    );
  }

  // In compact (member) mode, show only first 3 tasks unless expanded
  const visibleTasks = compact && !showAll ? tasks.slice(0, 3) : tasks;
  const hasMore = compact && tasks.length > 3;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}
          >
            {visibleTasks.map(task => {
              const isCompleted = task.status === "completed";

              // Completed tasks: simplified card
              if (isCompleted) {
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={task.id}
                    onClick={() => onSelect(task)}
                    className="group p-4 bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/30 hover:border-green-400/60 rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-sm overflow-hidden"
                  >
                    {task.proofLink && (
                      <div className="relative w-full h-[60px] mb-2 rounded-lg overflow-hidden border border-green-200/40">
                        <img 
                          src={task.proofLink} 
                          alt="Task Screenshot" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className={cn(
                      "text-[13px] font-medium leading-snug line-clamp-2",
                      task.description ? "text-foreground/80" : "text-muted-foreground italic opacity-60"
                    )}>
                      {task.description || "No description provided"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] uppercase tracking-widest text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                      {task.createdAt && (
                        <span className="text-[9px] text-muted-foreground/50 font-medium">
                          {format(new Date(task.createdAt), "MMM d")}
                        </span>
                      )}
                      <Badge variant="outline" className={cn(
                        "border-0 shadow-none text-[9px] font-black px-1.5 py-0.5 tracking-tighter uppercase rounded-md ml-2",
                        task.priority === "high" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                        task.priority === "easy" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {task.priority || "medium"}
                      </Badge>
                    </div>
                  </motion.div>
                );
              }

              // Active tasks: full card
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={task.id}
                  onClick={() => onSelect(task)}
                  className="group p-5 bg-background border border-border/50 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md rounded-[1.25rem] cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[120px] shadow-sm overflow-hidden"
                >
                  {task.proofLink && (
                    <div className="relative w-full h-[80px] mb-3 rounded-lg overflow-hidden border border-border/40 group-hover:border-primary/20 transition-colors">
                      <img 
                        src={task.proofLink} 
                        alt="Task Screenshot" 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className={cn(
                          "text-[15px] font-medium leading-snug line-clamp-3",
                          task.description ? "text-foreground" : "text-muted-foreground italic opacity-60"
                        )}>
                          {task.description || "No description provided"}
                        </p>
                        {task.createdAt && (
                          <p className="text-[10px] text-muted-foreground/60 font-medium mt-1.5 flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                            {format(new Date(task.createdAt), "MMM d, h:mm a")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {onDeleteTask && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task);
                            }}
                            className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Badge variant="outline" className={cn(
                      "border-0 shadow-none text-[11px] font-bold px-2.5 py-1 tracking-wide uppercase",
                      task.status === "review" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                      task.status === "in_progress" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                      task.status === "in_list" ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {task.status?.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {task.assignee && (
                        <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                          {task.assignee}
                        </span>
                      )}
                      <Badge variant="outline" className={cn(
                        "border-0 shadow-none text-[10px] font-black px-2 py-0.5 tracking-tighter uppercase rounded-md",
                        (task.priority === "high") ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                        (task.priority === "easy") ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {task.priority || "medium"}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/50 shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground">Task</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground text-center">Priority</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground text-center">Status</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground text-center">Assignee</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground text-right hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {visibleTasks.map(task => (
                    <tr 
                      key={task.id} 
                      onClick={() => onSelect(task)}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {task.proofLink && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/40 flex-shrink-0">
                              <img src={task.proofLink} className="w-full h-full object-cover" alt="" />
                            </div>
                          )}
                          <p className="text-sm font-medium text-foreground line-clamp-1 max-w-[120px] sm:max-w-[300px]">
                            {task.description || "No description"}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={cn(
                          "border-0 shadow-none text-[9px] font-black px-2 py-0.5 tracking-tighter uppercase rounded-md",
                          (task.priority === "high") ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                          (task.priority === "easy") ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                          {task.priority || "medium"}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={cn(
                          "border-0 shadow-none text-[9px] font-bold px-2 py-0.5 tracking-wide uppercase",
                          task.status === "review" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                          task.status === "in_progress" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                          task.status === "in_list" ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" :
                          task.status === "completed" ? "bg-green-500/10 text-green-700 dark:text-green-500" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {task.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[11px] font-bold text-primary truncate max-w-[60px] sm:max-w-[100px] inline-block">
                          {task.assignee || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {task.createdAt ? format(new Date(task.createdAt), "MMM d") : "-"}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50">
                            {task.createdAt ? format(new Date(task.createdAt), "h:mm a") : ""}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* See More / See Less button for member columns */}
      {hasMore && (
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(!showAll);
          }}
          className="w-full h-10 rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5 border border-dashed border-primary/20"
        >
          {showAll ? `Show Less` : `See More (${tasks.length - 3} more)`}
        </Button>
      )}
    </div>
  );
}

function TaskModal({ task, members, onClose }: { task: Task; members: string[]; onClose: () => void }) {
  const updateTask = useUpdateWallxyTask();
  const { data: allTasks } = useWallxyTasks();
  const { data: membersObj } = useTeamMembers("Wallxy");
  const { toast } = useToast();
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [comment, setComment] = useState(task.comment || "");
  const [status, setStatus] = useState(task.status || "in_progress");
  const [priority, setPriority] = useState(task.priority || "medium");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleStartTask = () => {
    if (!assignee) {
      setErrors({ assignee: true });
      toast({ 
        title: "Field Required! ⚠️", 
        description: "Please select your name before claiming the task.", 
        variant: "destructive" 
      });
      return;
    }
    setErrors({});

    // Check task limit (max 2 active tasks)
    const activeTasks = allTasks?.filter(t => t.assignee === assignee && t.status !== "completed" && t.status !== "review") || [];
    if (activeTasks.length >= 2) {
      const member = membersObj?.find(m => m.name === assignee);
      const isFemale = member?.gender === "female";
      
      const message = isFemale 
        ? `Ag ${assignee}, pyle te ${activeTasks.length} task purn kar ani m ajun gheee ka ash karte chal kar bar!`
        : `Aree ${assignee}, pyle te ${activeTasks.length} task purn kar ani m ajun gheee ka ash kart chal kar bar!`;
      
      toast({ 
        title: "Rule is Rule! 🛑", 
        description: message, 
        variant: "destructive" 
      });
      return;
    }

    updateTask.mutate({ id: task.id, updates: { status: "in_progress", assignee } }, {
      onSuccess: () => {
        toast({ title: "Task Assigned!", description: `Swagat aahe ${assignee}! Aata kamala laga! 🦾🏎️` });
        onClose();
      }
    });
  };

  const handleUpdateStatus = () => {
    if (!status) {
      setErrors({ status: true });
      toast({ 
        title: "Field Required! ⚠️", 
        description: "Please select a status before saving.", 
        variant: "destructive" 
      });
      return;
    }
    setErrors({});

    const updates: any = { status, comment };
    if (status === "in_list") {
      updates.assignee = null;
    }
    updates.priority = priority;
    updateTask.mutate({ id: task.id, updates }, {
      onSuccess: () => {
        const isCompl = updates.status === "completed";
        const title = isCompl ? "विषय हार्ड! 🔥" : "Task Updated";
        const desc = isCompl ? `लय भारी ${task.assignee}! Ek Number Kaam! 👑` : "Status saved successfully.";
        toast({ title, description: desc });
        onClose();
      }
    });
  };

  const isAssigned = !!task.assignee;
  const isCompleted = task.status === "completed";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] border border-border/50 bg-card text-foreground p-0 overflow-hidden shadow-2xl rounded-[2rem]">
        <div className="p-6 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-2xl font-display font-bold text-foreground flex gap-3 items-center">
            <Briefcase className="w-6 h-6 text-primary" /> Task Details
          </DialogTitle>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          {task.proofLink && (
            <div className="relative w-full h-[250px] rounded-[1.5rem] overflow-hidden border border-border/50 group">
              <img 
                src={task.proofLink} 
                alt="Task Screenshot" 
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" onClick={() => window.open(task.proofLink!, '_blank')}>View Full Size</Button>
              </div>
            </div>
          )}
          <div className="bg-muted/20 p-5 rounded-[1.5rem] border border-border/50">
            <h4 className="text-[11px] uppercase tracking-widest text-primary font-bold mb-2">Description</h4>
            <p className="text-foreground/90 text-[15px] whitespace-pre-wrap">{task.description}</p>
          </div>
          {isCompleted ? (
            <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-[1.5rem]">
              <p className="text-green-700 dark:text-green-400 font-bold">Completed by {task.assignee}</p>
              {task.comment && <p className="mt-2 italic">"{task.comment}"</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {!isAssigned ? (
                <div className="space-y-3">
                  <div>
                    <Select value={assignee} onValueChange={(v) => { setAssignee(v); setErrors(prev => ({ ...prev, assignee: false })); }}>
                      <SelectTrigger className={cn("h-14 rounded-xl font-bold", errors.assignee && "border-red-500 border-2 ring-2 ring-red-500/20")}>
                        <SelectValue placeholder="Who are you?" />
                      </SelectTrigger>
                      <SelectContent>{members.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.assignee && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">⚠ Please select your name</p>
                    )}
                  </div>
                  <Button onClick={handleStartTask} className="w-full h-14 rounded-xl font-bold text-lg">Claim Task</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Select value={status} onValueChange={(v) => { setStatus(v); setErrors(prev => ({ ...prev, status: false })); }}>
                      <SelectTrigger className={cn("h-14 rounded-xl font-bold", errors.status && "border-red-500 border-2 ring-2 ring-red-500/20")}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_list">Move to List</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Send for Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">⚠ Please select a status</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground ml-1 mb-2 block">Priority Level</label>
                    <div className="flex gap-2">
                      {["easy", "medium", "high"].map((p) => (
                        <Button
                          key={p}
                          type="button"
                          variant="outline"
                          onClick={() => setPriority(p as any)}
                          className={cn(
                            "flex-1 h-10 rounded-xl text-[10px] uppercase font-bold tracking-widest border-2 transition-all",
                            priority === p ? (
                              p === "high" ? "bg-red-500/10 border-red-500 text-red-600 shadow-sm scale-[1.02]" :
                              p === "medium" ? "bg-amber-500/10 border-amber-500 text-amber-600 shadow-sm scale-[1.02]" :
                              "bg-green-500/10 border-green-500 text-green-600 shadow-sm scale-[1.02]"
                            ) : "border-border/50 hover:bg-muted opacity-60"
                          )}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Notes..." className="rounded-xl h-24" />
                  <Button onClick={handleUpdateStatus} className="w-full h-14 rounded-xl font-bold text-lg">Save Changes</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskModal({ onClose, initialProofLink = "" }: { onClose: () => void; initialProofLink?: string }) {
  const createTask = useCreateWallxyTask();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"easy" | "medium" | "high">("medium");
  const [proofLink, setProofLink] = useState(initialProofLink);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialProofLink) setProofLink(initialProofLink);
  }, [initialProofLink]);

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!description.trim() && !proofLink.trim()) {
      newErrors.description = true;
      newErrors.proofLink = true;
      toast({ 
        title: "Fields Required! ⚠️", 
        description: "Please add a description or upload a screenshot.", 
        variant: "destructive" 
      });
      setErrors(newErrors);
      return;
    }
    setErrors({});
  
    createTask.mutate({ description, proofLink, priority }, {
      onSuccess: () => {
        toast({ title: "Created!", description: "Task added to board" });
        onClose();
      }
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px] border border-border/50 bg-card rounded-[2rem]">
        <div className="p-6 border-b border-border/50"><DialogTitle className="text-xl font-bold">New Task</DialogTitle></div>
        <div className="p-6 space-y-6">
          <div>
            <Textarea 
              value={description} 
              onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: false })); }} 
              placeholder="Description..." 
              className={cn("h-28 rounded-xl", errors.description && "border-red-500 border-2 ring-2 ring-red-500/20")} 
            />
            {errors.description && (
              <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">⚠ Add a description or screenshot</p>
            )}
          </div>
          <div>
            <ScreenshotUpload value={proofLink} onChange={(v) => { setProofLink(v); setErrors(prev => ({ ...prev, proofLink: false })); }} />
            {errors.proofLink && !errors.description && (
              <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">⚠ Upload a screenshot or add description</p>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground ml-1 mb-2 block">Priority Level</label>
            <div className="flex gap-2">
              {["easy", "medium", "high"].map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  onClick={() => setPriority(p as any)}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-[10px] uppercase font-bold tracking-widest border-2 transition-all",
                    priority === p ? (
                      p === "high" ? "bg-red-500/10 border-red-500 text-red-600 shadow-sm scale-[1.02]" :
                      p === "medium" ? "bg-amber-500/10 border-amber-500 text-amber-600 shadow-sm scale-[1.02]" :
                      "bg-green-500/10 border-green-500 text-green-600 shadow-sm scale-[1.02]"
                    ) : "border-border/50 hover:bg-muted opacity-60"
                  )}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createTask.isPending} className="w-full h-12 rounded-xl font-bold">{createTask.isPending ? "Adding..." : "Add Task"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
