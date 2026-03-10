"use client";

import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const safeFormatDate = (dateOrString: any, formatStr: string) => {
  if (!dateOrString) return "N/A";
  let date: Date;
  if (typeof dateOrString === "string") {
    date = parseISO(dateOrString);
  } else {
    date = dateOrString;
  }
  return isValid(date) ? format(date, formatStr) : "Invalid Date";
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
  Trash
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
  const { data: allTasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const verifyCode = useVerifyCode();
  const deleteTask = useDeleteTask();

  const companyTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter((t: Task) => t.companyName === name)
      .sort((a: Task, b: Task) => new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime());
  }, [allTasks, name]);

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

  const companyInfo = companyTasks[0];

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
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
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
        toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <DetailSkeleton />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      
      <header className="pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 md:mb-6 group px-2 md:px-3">
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm md:text-base">Back to Dashboard</span>
          </Button>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl shadow-primary/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10" />
          
          <div className="space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-2.5 md:p-3 bg-primary/10 text-primary rounded-2xl w-fit">
                <Building2 className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground break-words">
                  {name}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-muted-foreground">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    Joined {companyInfo?.dateOfJoin ? safeFormatDate(companyInfo.dateOfJoin, "MMM d, yyyy") : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto mt-4 md:mt-0">
            <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold rounded-full border-primary/10 bg-primary/5 text-primary w-fit">
              <History className="w-4 h-4 mr-2" />
              {companyTasks.length} Total Tasks
            </Badge>
          </div>
        </motion.div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8">
        <div className="space-y-12">
          {groupedTasks.map(([date, tasks], groupIdx) => (
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
                    {safeFormatDate(date, "EEEE")} • {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
                  </p>
                </div>
                <div className="flex-grow h-[1px] bg-gradient-to-r from-border/50 to-transparent ml-4" />
              </div>

              <div className="grid gap-4 ml-0 sm:ml-14">
                {tasks.map((task) => (
                  <Card key={task.id} className="group border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md bg-card/50 backdrop-blur-sm relative overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-6">
                        <div className="space-y-4 flex-grow">
                          <div className="flex flex-wrap gap-3">
                            <Badge className={cn(
                              "font-semibold rounded-lg px-2.5 py-1",
                              task.status === "completed" 
                                ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100" 
                                : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                            )}>
                              {task.status === "completed" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              {task.status === "completed" ? "Completed" : "In Progress"}
                            </Badge>

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
                          </div>

                          <div className="flex gap-3">
                            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                              {task.description}
                            </p>
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

                        <div className="flex gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity mt-4 md:mt-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditClick(task)}
                            className="h-10 w-10 md:h-9 md:w-9 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary bg-muted/20 md:bg-transparent"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteTask(task)}
                            className="h-10 w-10 md:h-9 md:w-9 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive bg-muted/20 md:bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                          toast({ title: "Error", description: error.message || "Invalid code", variant: "destructive" });
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
                      toast({ title: "Error", description: "Invalid code", variant: "destructive" });
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
