"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, CheckCircle2, Inbox, SearchX, Loader2, 
  Image as ImageIcon, ExternalLink, Plus, UserPlus,
  UploadCloud, Sparkles, Eye, EyeOff, Zap, X, UserMinus, Trash2
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

  const { unassigned, assigned, reviewTasks } = useMemo(() => {
    if (!tasks) return { unassigned: [], assigned: {} as Record<string, Task[]>, reviewTasks: [] };
    
    const un = tasks.filter(t => !t.assignee && t.status !== "completed" && t.status !== "review");
    const rev = tasks.filter(t => t.status === "review");
    
    const ass = members.reduce((acc, m) => {
      acc[m] = tasks.filter(t => t.assignee === m);
      return acc;
    }, {} as Record<string, Task[]>);

    return { unassigned: un, assigned: ass, reviewTasks: rev };
  }, [tasks, members]);

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
              className="fixed bottom-8 right-8 z-[110] bg-card border border-border/50 rounded-2xl p-6 shadow-2xl flex items-center gap-6 min-w-[300px]"
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
            className="w-full max-w-2xl bg-card border border-border/50 shadow-sm rounded-[2.5rem] p-6 md:p-8 z-10 relative overflow-hidden"
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
                  {unassigned.length} Tasks
                </div>
                <CreateMemberModal companyName="Wallxy" />
                <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> New Task
                </Button>
              </div>
            </div>
            
            <TaskGrid 
              tasks={unassigned} 
              onSelect={setSelectedTask} 
              emptyText="All tasks are assigned!" 
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 w-full gap-6 z-10">
            {members.map((member, i) => {
              const memberTasks = assigned[member] || [];
              const completedCount = memberTasks.filter(t => t.status === "completed").length;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={member}
                  className="flex-1 min-w-[300px] max-w-[420px] w-full bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 rounded-[2rem] p-6 shadow-sm group relative overflow-hidden"
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
        toast({ title: "Task Removed", description: "The task has been deleted." });
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
  tasks, onSelect, compact = false, emptyText, onDropFile, onDeleteTask 
}: { 
  tasks: Task[], onSelect: (t: Task) => void, compact?: boolean, emptyText: string, onDropFile?: (file: File) => void, onDeleteTask?: (t: Task) => void
}) {
  const [isHoverDragging, setIsHoverDragging] = useState(false);

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

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
      <AnimatePresence mode="popLayout">
        {tasks.map(task => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key={task.id}
            onClick={() => onSelect(task)}
            className="group p-5 bg-background border border-border/50 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md rounded-[1.25rem] cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[120px] shadow-sm overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className={cn(
                  "text-[15px] font-medium leading-snug line-clamp-3",
                  task.description ? "text-foreground" : "text-muted-foreground italic opacity-60"
                )}>
                  {task.description || "No description provided"}
                </p>
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
                  {task.proofLink && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <Badge variant="outline" className={cn(
                "border-0 shadow-none text-[11px] font-bold px-2.5 py-1 tracking-wide uppercase",
                task.status === "completed" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                task.status === "review" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                task.status === "in_progress" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                task.status === "in_list" ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" :
                "bg-muted text-muted-foreground"
              )}>
                {task.status?.replace('_', ' ')}
              </Badge>
              {task.assignee && (
                <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                  {task.assignee}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
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

  const handleStartTask = () => {
    if (!assignee) return;

    // Check task limit (max 2 active tasks)
    const activeTasks = allTasks?.filter(t => t.assignee === assignee && t.status !== "completed") || [];
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
        toast({ title: "Task Assigned!", description: "You are now working on this task." });
        onClose();
      }
    });
  };

  const handleUpdateStatus = () => {
    const updates: any = { status, comment };
    if (status === "in_list") {
      updates.assignee = null;
    }
    updateTask.mutate({ id: task.id, updates }, {
      onSuccess: () => {
        toast({ title: "Task Updated", description: "Status saved successfully." });
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
              <Image src={task.proofLink} alt="Task Screenshot" fill className="object-contain" />
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
                <div className="space-y-4">
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger className="h-14 rounded-xl font-bold"><SelectValue placeholder="Who are you?" /></SelectTrigger>
                    <SelectContent>{members.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={handleStartTask} className="w-full h-14 rounded-xl font-bold text-lg">Claim Task</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-14 rounded-xl font-bold"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_list">Move to List</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Send for Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
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
  const [proofLink, setProofLink] = useState(initialProofLink);

  useEffect(() => {
    if (initialProofLink) setProofLink(initialProofLink);
  }, [initialProofLink]);

  const handleSubmit = () => {
    if (!description.trim() && !proofLink.trim()) return;
    createTask.mutate({ description, proofLink }, {
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
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="h-28 rounded-xl" />
          <ScreenshotUpload value={proofLink} onChange={setProofLink} />
          <Button onClick={handleSubmit} disabled={createTask.isPending} className="w-full h-12 rounded-xl font-bold">{createTask.isPending ? "Adding..." : "Add Task"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
