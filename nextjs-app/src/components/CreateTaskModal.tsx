import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Lock, Briefcase, Calendar, FileText, Loader2, Plus, Trash2, CheckCircle2, Clock, ListTodo, Link as LinkIcon } from "lucide-react";

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
import { useCreateTask, useTasks, useVerifyCode } from "@/hooks/use-tasks";
import { insertTaskSchema, type Task, createTasksBulkRequestSchema, type CreateTasksBulkRequest } from "@/shared/schema";
import { cn } from "@/lib/utils";

export function CreateTaskModal() {
  const [open, setOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();
  const createTask = useCreateTask();
  const { data: tasks } = useTasks();

  const companies = Array.from(new Set(tasks?.map((t: Task) => t.companyName) || [])).sort();

  const form = useForm<CreateTasksBulkRequest>({
    resolver: zodResolver(createTasksBulkRequestSchema) as any,
    defaultValues: {
      companyName: "",
      dateOfJoin: "",
      taskDate: "",
      tasks: [
        { 
          description: "", 
          status: "in_progress", 
          proofLink: "",
        }
      ],
      secretCode: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  // DOJ Auto-fetch logic
  const companyName = form.watch("companyName");
  useEffect(() => {
    if (!companyName || !tasks) return;
    
    const existingTask = tasks.find((t: Task) => t.companyName.toLowerCase() === companyName.toLowerCase());
    if (existingTask?.dateOfJoin) {
      const currentDOJ = form.getValues("dateOfJoin");
      if (currentDOJ !== existingTask.dateOfJoin) {
        form.setValue("dateOfJoin", existingTask.dateOfJoin);
        toast({
          title: "DOJ Auto-fetched",
          description: `Date of Join for ${existingTask.companyName} has been populated.`,
          duration: 2000,
        });
      }
    }
  }, [companyName, tasks, form, toast]);

  const verifyCode = useVerifyCode();

  const handleAuthorize = () => {
    const code = form.getValues("secretCode");
    
    verifyCode.mutate(code, {
      onSuccess: () => {
        setIsAuthorized(true);
        toast({
          title: "Access Granted",
          description: "Form is now unlocked.",
          variant: "default",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Access Denied",
          description: error.message || "Invalid secure code.",
          variant: "destructive",
        });
        form.setValue("secretCode", "");
      }
    });
  };

  const onSubmit = (values: CreateTasksBulkRequest) => {
    // Add startDate to each task automatically using taskDate
    const tasksWithStartDate = values.tasks.map(task => ({
      ...task,
      startDate: task.startDate || values.taskDate, // Default to taskDate if not provided
    }));

    createTask.mutate({ ...values, tasks: tasksWithStartDate }, {
      onSuccess: () => {
        toast({
          title: "Tasks Added Successfully",
          description: `${values.tasks.length} tasks have been logged.`,
          variant: "default",
        });
        setOpen(false);
        setIsAuthorized(false); // Reset for next time
        form.reset({
          ...form.getValues(),
          companyName: "",
          dateOfJoin: "",
          tasks: [{ description: "", status: "in_progress", proofLink: "" }],
          secretCode: "",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Submission Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setIsAuthorized(false);
      form.setValue("secretCode", "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-4 md:px-6 w-full sm:w-auto h-11 md:h-12">
          <Plus className="w-5 h-5 mr-2" />
          Log Daily Work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] w-[95vw] sm:w-full p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-all duration-300">
        {!isAuthorized ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-display">Secure Access</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Please enter your authorization code to access the task form.
              </DialogDescription>
            </div>
            <div className="w-full max-w-[300px] space-y-4">
              <Input 
                type="password" 
                placeholder="Secure Code" 
                className="text-center text-lg tracking-widest font-mono h-12"
                value={form.watch("secretCode")}
                onChange={(e) => form.setValue("secretCode", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuthorize()}
              />
              <Button 
                onClick={handleAuthorize} 
                disabled={verifyCode.isPending}
                className="w-full h-11 font-semibold text-base"
              >
                {verifyCode.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unlock Form"}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-primary/10 px-4 md:px-6 py-4 md:py-6 border-b border-primary/10 flex-shrink-0">
              <DialogHeader>
                <DialogTitle className="font-display text-xl md:text-2xl text-foreground flex items-center gap-2">
                  <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  Add Daily Tasks
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1 md:mt-2 text-xs md:text-sm">
                  Logged in as authorized user. Record your work progress below.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 font-medium text-xs md:text-sm">Company</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Acme Corp" 
                              className="h-9 md:h-10 rounded-lg border-muted-foreground/20 text-sm" 
                              list="company-list"
                              {...field} 
                            />
                          </FormControl>
                          <datalist id="company-list">
                            {companies.map(company => (
                              <option key={company} value={company} />
                            ))}
                          </datalist>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
...

                    <FormField
                      control={form.control}
                      name="dateOfJoin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 font-medium">DOJ</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-9 rounded-lg border-muted-foreground/20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taskDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 font-medium">Task Date</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-9 rounded-lg border-muted-foreground/20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-primary" />
                        Task List ({fields.length})
                      </h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => append({ 
                          description: "", 
                          status: "in_progress"
                        })}
                        className="h-8 md:h-9 rounded-lg text-primary border-primary/20 hover:bg-primary/5 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Another
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="relative group p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors">
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

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`tasks.${index}.description`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-medium text-muted-foreground">Work Description</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Briefly describe what you worked on..." 
                                        className="min-h-[80px] md:min-h-[100px] rounded-lg border-muted-foreground/20 focus-visible:ring-primary/50 resize-none text-sm" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`tasks.${index}.proofLink`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-medium text-muted-foreground">Proof Link (Optional)</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input 
                                          placeholder="https://..." 
                                          className="h-9 md:h-10 rounded-lg border-muted-foreground/20 pl-8 text-xs" 
                                          {...field} 
                                        />
                                        <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`tasks.${index}.status`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-medium text-muted-foreground">Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger className={cn(
                                          "h-9 md:h-10 rounded-lg border-muted-foreground/20 text-xs font-medium",
                                          field.value === "completed" ? "text-green-600 bg-green-50/50 border-green-200" : "text-amber-600 bg-amber-50/50 border-amber-200"
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
                                      </SelectContent>
                                    </Select>
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

                  <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-background/95 backdrop-blur-sm -mx-6 px-6 py-4 border-t border-border/10">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setOpen(false)}
                      className="rounded-lg h-10 px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTask.isPending}
                      className="rounded-lg h-10 px-8 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all font-semibold"
                    >
                      {createTask.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Finish \u0026 Log All Tasks"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
