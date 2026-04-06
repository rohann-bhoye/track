"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, CheckCircle2, Inbox, SearchX, Loader2, 
  Image as ImageIcon, ExternalLink, Plus, UserPlus,
  UploadCloud, Sparkles, Eye, EyeOff, Zap, X, UserMinus, Trash2, FolderOpen, Folder
} from "lucide-react";
import { 
  useWallxyTasks, useUpdateWallxyTask, useTeamMembers, 
  useCreateWallxyTask, useDeleteTeamMember, useDeleteWallxyTask,
  useBoardFolders, useCreateBoardFolder, useDeleteBoardFolder
} from "@/hooks/use-tasks";
import { type Task, type BoardFolder } from "@/shared/schema";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";
import { CreateMemberModal } from "@/components/CreateMemberModal";

export default function WallxyDashboard() {
  const { data: tasks, isLoading: tasksLoading, isError } = useWallxyTasks();
  const { data: membersObj } = useTeamMembers("Wallxy");
  const { data: boardFolders } = useBoardFolders();
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [pendingProofLink, setPendingProofLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [memberToDelete, setMemberToDelete] = useState<{id: string, name: string} | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<BoardFolder | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>("All Work");
  
  // New modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [pendingDropGroups, setPendingDropGroups] = useState<any[]>([]);

  const { toast } = useToast();

  const handleMagicUpload = async (files: File[]) => {
    if (files.length === 0 || !files[0].type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please drop at least one image.", variant: "destructive" });
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
      const fileArray = Array.from(files);
      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) continue;
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.secure_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setPendingDropGroups([{ folderName: "Batch Upload", urls: uploadedUrls }]);
        setShowDropModal(true);
      }
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const [pendingScreenshotGroups, setPendingScreenshotGroups] = useState<any[]>([]);
  
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

  // Derived folders list for UI tabs
  const folders = useMemo(() => {
    return Array.from(new Set(boardFolders?.map(f => f.name) || [])).sort();
  }, [boardFolders]);

  const validFolderNames = useMemo(() => new Set(folders), [folders]);

  const hasUncategorized = useMemo(() => {
    if (!tasks) return false;
    return tasks.some(t => !t.boardFolder || !validFolderNames.has(t.boardFolder));
  }, [tasks, validFolderNames]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (activeFolder === "All Work") return tasks;
    if (activeFolder === "Uncategorized") {
      return tasks.filter(t => !t.boardFolder || !validFolderNames.has(t.boardFolder));
    }
    return tasks.filter(t => t.boardFolder === activeFolder);
  }, [tasks, activeFolder, validFolderNames]);

  const { unassigned, assigned, reviewTasks } = useMemo(() => {
    if (!filteredTasks) return { unassigned: [], assigned: {} as Record<string, Task[]>, reviewTasks: [] };
    
    // Sort all tasks by createdAt ascending (oldest first)
    const sortedTasks = [...filteredTasks].sort((a, b) => {
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

    return { unassigned: un, assigned: ass, reviewTasks: rev };
  }, [filteredTasks, members]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (tasksLoading) {
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

        {/* Board Folders / Tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          <Button 
            variant={activeFolder === "All Work" ? "default" : "outline"} 
            onClick={() => setActiveFolder("All Work")}
            className="rounded-full px-6 transition-all"
          >
            All Work
          </Button>
          {hasUncategorized && (
            <Button 
              variant={activeFolder === "Uncategorized" ? "default" : "outline"} 
              onClick={() => setActiveFolder("Uncategorized")}
              className="rounded-full px-6 transition-all"
            >
              Uncategorized
            </Button>
          )}
          {folders.map(f => {
            const isBoardFolder = boardFolders?.find(bf => bf.name === f);
            return (
              <div key={f} className="group relative flex items-center">
                <Button 
                  variant={activeFolder === f ? "default" : "outline"} 
                  onClick={() => setActiveFolder(f)}
                  className={cn("rounded-full transition-all flex items-center gap-2", isBoardFolder ? "pl-6 pr-10" : "px-6")}
                >
                  <FolderOpen className="w-4 h-4" /> {f}
                </Button>
                {isBoardFolder && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(isBoardFolder);
                    }}
                    title="Remove Category"
                    className="absolute right-1 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
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
                if (e.dataTransfer.files?.length) handleMagicUpload(Array.from(e.dataTransfer.files));
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
                  {unassigned.length} Tasks
                </div>
                <CreateMemberModal companyName="Wallxy" />
                <Button onClick={() => setShowCreateModal(true)} className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
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

      {folderToDelete && (
        <DeleteFolderDialog 
          folder={folderToDelete} 
          onClose={() => setFolderToDelete(null)} 
        />
      )}

      {showCreateModal && (
        <CreateTaskModal 
          folders={folders}
          onClose={() => setShowCreateModal(false)} 
        />
      )}
      
      {showDropModal && (
        <CreateTaskModal 
          folders={folders}
          onClose={() => setShowDropModal(false)} 
          initialGroups={pendingDropGroups} 
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

function TaskGrid({ tasks, onSelect, compact = false, emptyText, onDropFile, onDeleteTask }: { 
  tasks: Task[]; 
  onSelect: (t: Task) => void; 
  compact?: boolean; 
  emptyText: string; 
  onDropFile?: (files: File[]) => void; 
  onDeleteTask?: (t: Task) => void;
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
            onDropFile(Array.from(e.dataTransfer.files));
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
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
        <AnimatePresence mode="popLayout">
          {visibleTasks.map(task => {
            const isCompleted = task.status === "completed";
            const groups = task.screenshotGroups || [];
            const primaryImage = groups.length > 0 && groups[0].urls.length > 0 ? groups[0].urls[0] : 
                               (task.proofLinks && task.proofLinks.length > 0 ? task.proofLinks[0] : task.proofLink);
            const totalPhotos = groups.reduce((acc, g) => acc + g.urls.length, 0) || 
                               (task.proofLinks?.length || (task.proofLink ? 1 : 0));

            // Completed tasks: simplified card (only image + text)
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
                  {primaryImage && (
                    <div className="relative w-full h-[60px] mb-2 rounded-lg overflow-hidden border border-green-200/40">
                      <img 
                        src={primaryImage} 
                        alt="Task" 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {totalPhotos > 1 && (
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <ImageIcon className="w-2 h-2" /> {totalPhotos}
                        </div>
                      )}
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
                {primaryImage && (
                  <div className="relative w-full h-[80px] mb-3 rounded-lg overflow-hidden border border-border/40 group-hover:border-primary/20 transition-colors">
                    <img 
                      src={primaryImage} 
                      alt="Task Screenshot" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xl">
                      {groups.length > 0 ? (
                        <><FolderOpen className="w-3 h-3" /> {groups.length} Folders</>
                      ) : (
                        <><ImageIcon className="w-3 h-3" /> {totalPhotos} Photos</>
                      )}
                    </div>
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
                    task.status === "go_for_change" ? "bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-400/30" :
                    task.status === "dont_go" ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-400/30" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {task.status === "go_for_change" ? "Go for Change" :
                     task.status === "dont_go" ? "Don't Go" :
                     task.status?.replace(/_/g, ' ')}
                  </Badge>
                  {task.assignee && (
                    <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                      {task.assignee}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
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
  const { data: boardFolders } = useBoardFolders(); // Fetch board folders
  const { toast } = useToast();
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [comment, setComment] = useState(task.comment || "");
  const [status, setStatus] = useState(task.status || "in_progress");
  const [boardFolder, setBoardFolder] = useState<string>(task.boardFolder || "none");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Combine existing folders from tasks and explicit board folders
  const availableFolders = useMemo(() => {
    const list = new Set<string>();
    boardFolders?.forEach(f => list.add(f.name));
    allTasks?.forEach(t => {
      if (t.boardFolder) list.add(t.boardFolder);
    });
    return Array.from(list).sort();
  }, [boardFolders, allTasks]);

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

    // No task limit imposed; users can take unlimited tasks.

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

    const updates: any = { status, comment, boardFolder: boardFolder === "none" ? null : boardFolder };
    if (status === "in_list") {
      updates.assignee = null;
      // If Sir already marked this "Go for Change", preserve that status
      // so it stays visible in the list with the orange badge
      if (task.status === "go_for_change") {
        updates.status = "go_for_change";
      }
    }
    updateTask.mutate({ id: task.id, updates }, {
      onSuccess: () => {
        const isCompl = updates.status === "completed";
        const isReturnedForChange = updates.status === "go_for_change" && !updates.assignee;
        const title = isCompl ? "विषय हार्ड! 🔥" : isReturnedForChange ? "Back to List 🔄" : "Task Updated";
        const desc = isCompl
          ? `लय भारी ${task.assignee}! Ek Number Kaam! 👑`
          : isReturnedForChange
          ? "Task returned — Sir's 'Go for Change' flag is still active."
          : "Status saved successfully.";
        toast({ title, description: desc });
        onClose();
      }
    });
  };

  const isAssigned = !!task.assignee;
  const isCompleted = task.status === "completed";
  const groups = task.screenshotGroups || [];
  const backupLinks = task.proofLinks || (task.proofLink ? [task.proofLink] : []);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px] border border-border/50 bg-card text-foreground p-0 overflow-hidden shadow-2xl rounded-[2rem]">
        <div className="p-6 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-2xl font-display font-bold text-foreground flex gap-3 items-center">
            <Briefcase className="w-6 h-6 text-primary" /> Task Details
          </DialogTitle>
        </div>
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[85vh] custom-scrollbar">
          {/* Board Folder / Project Categorization */}
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-primary" />
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest font-black text-primary/60">Project / Folder</p>
                <div className="relative min-w-[180px]">
                  <Select value={boardFolder} onValueChange={setBoardFolder}>
                    <SelectTrigger className="bg-transparent border-none p-0 h-auto text-sm font-bold shadow-none focus:ring-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-primary/50 hover:[&>svg]:text-primary transition-colors">
                      <SelectValue placeholder="Uncategorized" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="none" className="text-muted-foreground italic font-medium">Uncategorized</SelectItem>
                      {availableFolders.map(f => (
                        <SelectItem key={f} value={f} className="font-bold">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium italic">Edit to move task</p>
          </div>

          {/* Folders Review View */}
          {groups.length > 0 ? (
            <div className="space-y-10">
              {groups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{group.folderName}</h3>
                      <p className="text-xs text-muted-foreground font-medium">{group.urls.length} images to review</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.urls.map((url, iIdx) => (
                      <div key={iIdx} className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 group bg-muted/5 shadow-sm">
                        <img 
                          src={url} 
                          alt={`${group.folderName} screenshot`} 
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" size="sm" onClick={() => window.open(url, '_blank')}>View Full Size</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {gIdx < groups.length - 1 && <hr className="border-border/40 mt-6" />}
                </div>
              ))}
            </div>
          ) : (
            /* Traditional View for old tasks */
            backupLinks.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {backupLinks.map((url, idx) => (
                  <div key={idx} className="relative w-full h-[250px] rounded-[1.5rem] overflow-hidden border border-border/50 group bg-muted/5">
                    <img 
                      src={url} 
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" onClick={() => window.open(url, '_blank')}>View Full Size</Button>
                    </div>
                  </div>
                ))}
              </div>
            )
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
                  {/* Sir's review buttons - only for in_list tasks */}
                  {(task.status === "in_list" || task.status === "go_for_change" || task.status === "dont_go") && (
                    <div className="flex gap-3 pb-1">
                      <Button
                        onClick={() => updateTask.mutate({ id: task.id, updates: { status: "go_for_change" } }, { onSuccess: () => { toast({ title: "Go for Change! 🔄", description: "Sir ne review kela — Change kara!" }); onClose(); } })}
                        disabled={updateTask.isPending}
                        className="flex-1 h-11 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-md shadow-orange-500/20"
                      >
                        ✏️ Go for Change
                      </Button>
                      <Button
                        onClick={() => updateTask.mutate({ id: task.id, updates: { status: "dont_go" } }, { onSuccess: () => { toast({ title: "Don't Go ❌", description: "Sir ne reject kela — Punarvichar kara!" }); onClose(); } })}
                        disabled={updateTask.isPending}
                        className="flex-1 h-11 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white border-0 shadow-md shadow-red-500/20"
                      >
                        🚫 Don't Go
                      </Button>
                    </div>
                  )}
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

function CreateTaskModal({ onClose, folders = [], initialGroups = [] }: { onClose: () => void; folders?: string[]; initialGroups?: any[] }) {
  const createTask = useCreateWallxyTask();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [screenshotGroups, setScreenshotGroups] = useState<any[]>(initialGroups.length > 0 ? initialGroups : [{ folderName: "Screenshots", urls: [] }]);
  const [boardFolder, setBoardFolder] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialGroups.length > 0) setScreenshotGroups(initialGroups);
  }, [initialGroups]);

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    const hasImages = screenshotGroups.some(g => g.urls.length > 0);

    if (!description.trim() && !hasImages) {
      newErrors.description = true;
      newErrors.screenshotGroups = true;
      toast({ 
        title: "Fields Required! ⚠️", 
        description: "Please add a description or upload screenshots into folders.", 
        variant: "destructive" 
      });
      setErrors(newErrors);
      return;
    }
    setErrors({});

    createTask.mutate({ 
      description, 
      screenshotGroups, 
      boardFolder: boardFolder === "none" ? "" : boardFolder 
    }, {
      onSuccess: () => {
        toast({ title: "Created!", description: "Task added to " + (boardFolder || "Board") });
        onClose();
      }
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px] border border-border/50 bg-card rounded-[2rem] overflow-hidden p-0">
        <div className="p-6 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-xl font-bold">New Task</DialogTitle>
        </div>
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <label className="text-[11px] uppercase tracking-widest text-primary font-bold ml-1">Task Details</label>
            <Textarea 
              value={description} 
              onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: false })); }} 
              placeholder="Describe the work..." 
              className={cn("min-h-[120px] rounded-2xl bg-muted/5 focus:bg-background transition-colors", errors.description && "border-red-500")} 
            />
          </div>

          <div className="space-y-4">
            <label className="text-[11px] uppercase tracking-widest text-primary font-bold ml-1">Project / Category</label>
            <Select value={boardFolder || "none"} onValueChange={setBoardFolder}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/5">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {folders.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/wallxy/new" className="inline-flex items-center gap-1.5 text-[10px] text-primary hover:underline font-bold ml-1">
              <Plus className="w-3 h-3" /> Create New Folder
            </Link>
          </div>

          <div className="space-y-4 pt-2">
            <label className="text-[11px] uppercase tracking-widest text-primary font-bold ml-1">Screenshots</label>
            <ScreenshotUpload value={screenshotGroups} onChange={setScreenshotGroups} />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={createTask.isPending} 
            className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20"
          >
            {createTask.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Task to Board"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFolderDialog({ folder, onClose }: { folder: BoardFolder, onClose: () => void }) {
  const deleteFolder = useDeleteBoardFolder();
  const { toast } = useToast();

  const handleConfirm = () => {
    deleteFolder.mutate(folder.id.toString(), {
      onSuccess: () => {
        toast({ title: "Category Removed", description: `"${folder.name}" has been deleted.` });
        onClose();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] border-border/50 bg-card p-6">
        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
          <Trash2 className="w-5 h-5" /> Delete Category
        </DialogTitle>
        <div className="py-4">
          <p className="text-muted-foreground text-sm">
            Are you sure you want to remove the category <strong>"{folder.name}"</strong>? This will remove the tab, but tasks inside it will remain visible under their existing categorization.
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={deleteFolder.isPending}
          >
            {deleteFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
