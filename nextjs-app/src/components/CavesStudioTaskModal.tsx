"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSunday, parseISO } from "date-fns";
import { Briefcase, Loader2, Plus, Trash2, CheckCircle2, Clock, ListTodo, Palmtree, CalendarX, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateTeamTask, useTeamMembers } from "@/hooks/use-tasks";
import { createTasksBulkRequestSchema, type CreateTasksBulkRequest } from "@/shared/schema";
import { cn } from "@/lib/utils";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";

export function CavesStudioTaskModal({ memberName }: { memberName?: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createTask = useCreateTeamTask();
  const { data: members = [] } = useTeamMembers("Caves Studio");

  const form = useForm<CreateTasksBulkRequest>({
    resolver: zodResolver(createTasksBulkRequestSchema) as any,
    defaultValues: {
      companyName: "Caves Studio",
      dateOfJoin: "",
      taskDate: new Date().toISOString().split('T')[0],
      tasks: [
        { 
          description: "", 
          status: "in_progress", 
          proofLink: "",
          checkInTime: "",
          checkOutTime: "",
          assignee: memberName || "",
        }
      ],
      secretCode: "task123",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  // Sunday detection logic
  const taskDate = form.watch("taskDate");
  useEffect(() => {
    if (!taskDate) return;
    
    try {
      const date = parseISO(taskDate);
      if (isSunday(date)) {
        const currentTasks = form.getValues("tasks");
        const updatedTasks = currentTasks.map(task => ({
          ...task,
          status: task.status === "in_progress" ? "holiday" as const : task.status
        }));
        form.setValue("tasks", updatedTasks);
      }
    } catch (e) {
      console.error("Error parsing task date", e);
    }
  }, [taskDate, form]);

  const onSubmit = (values: CreateTasksBulkRequest) => {
    const tasksWithStartDate = values.tasks.map(task => ({
      ...task,
      startDate: task.startDate || values.taskDate,
    }));

    createTask.mutate({ ...values, tasks: tasksWithStartDate }, {
      onSuccess: () => {
        toast({
          title: "Session Saved",
          description: `${values.tasks.length} tasks added to Caves Studio tracker.`,
        });
        setOpen(false);
        form.reset({
          ...form.getValues(),
          tasks: [{ description: "", status: "in_progress", proofLink: "", assignee: memberName || "" }],
          secretCode: "task123",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Submission Failed",
          description: error.message || "Failed to log tasks.",
          variant: "destructive",
        });
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.setValue("secretCode", "task123"); 
      if (memberName) {
        const currentTasks = form.getValues("tasks");
        form.setValue("tasks", currentTasks.map(t => ({ ...t, assignee: memberName })));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant={memberName ? "outline" : "default"}
          className={cn(
            "rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg transition-all duration-300",
            memberName ? "h-10 border-primary/20 text-primary w-full shadow-none hover:bg-primary/5" : "h-12 shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 w-full px-4 bg-primary text-primary-foreground"
          )}
        >
          <Plus className="w-4 h-4 mr-2" />
          {memberName ? `Add Task for ${memberName}` : "Assign Tasks"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col transition-all duration-300 w-[95vw] sm:w-full">
        <div className="bg-primary/10 px-5 sm:px-6 py-5 sm:py-6 border-b border-primary/10 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-foreground flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              Caves Studio Task Assigner
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Assign tasks to team members directly.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-card border-none">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Team/Company</FormLabel>
                      <FormControl>
                        <Input 
                          readOnly
                          className="h-9 rounded-lg border-muted-foreground/20 bg-muted/50 cursor-not-allowed text-muted-foreground" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taskDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Target Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-9 rounded-lg border-muted-foreground/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-primary" />
                    Tasks ({fields.length})
                  </h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => append({ 
                      description: "", 
                      status: "in_progress",
                      proofLink: "",
                      checkInTime: "",
                      checkOutTime: "",
                      assignee: memberName || "",
                    })}
                    className="h-8 rounded-lg text-primary border-primary/20 hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Task
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="relative group p-4 rounded-xl border border-border/60 bg-background hover:border-primary/30 transition-colors">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.assignee`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Assignee</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9 rounded-lg border-muted-foreground/20 text-xs text-foreground">
                                      <SelectValue placeholder="Select Member" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl border-border/50">
                                    {members.length === 0 ? (
                                      <div className="p-2 text-xs text-muted-foreground italic">No members found</div>
                                    ) : (
                                      members.map(m => (
                                        <SelectItem key={m.id} value={m.name} className="text-xs">
                                          {m.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-6">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-muted-foreground">Task Details (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe the task to be completed... (Optional)" 
                                    className="min-h-[36px] h-9 rounded-lg border-muted-foreground/20 focus-visible:ring-primary/50 resize-none py-2 text-xs" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.status`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-muted-foreground">Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className={cn(
                                      "h-9 rounded-lg border-muted-foreground/20 text-xs font-medium",
                                      field.value === "completed" ? "text-green-600 bg-green-50/50 border-green-200" : 
                                      field.value === "holiday" ? "text-purple-600 bg-purple-50/50 border-purple-200" :
                                      field.value === "leave" ? "text-rose-600 bg-rose-50/50 border-rose-200" :
                                      "text-amber-600 bg-amber-50/50 border-amber-200"
                                    )}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl border-border/50">
                                    <SelectItem value="in_progress" className="text-amber-600 focus:bg-amber-50 focus:text-amber-700">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        In Progress
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="completed" className="text-green-600 focus:bg-green-50 focus:text-green-700">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Completed
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="holiday" className="text-purple-600 focus:bg-purple-50 focus:text-purple-700">
                                      <div className="flex items-center gap-2">
                                        <Palmtree className="w-3.5 h-3.5" />
                                        Holiday
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="leave" className="text-rose-600 focus:bg-rose-50 focus:text-rose-700">
                                      <div className="flex items-center gap-2">
                                        <CalendarX className="w-3.5 h-3.5" />
                                        Leave
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Screenshot Upload Row */}
                        <div className="md:col-span-12 mt-2">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.proofLink`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-muted-foreground">Screenshot / Proof</FormLabel>
                                <FormControl>
                                  <ScreenshotUpload 
                                    value={field.value || ""} 
                                    onChange={field.onChange} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="rounded-lg h-10 px-6 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTask.isPending}
                  className="rounded-lg h-10 px-8 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all font-semibold w-full sm:w-auto"
                >
                  {createTask.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Tasks"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
