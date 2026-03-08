import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Lock, Briefcase, Calendar, FileText, Loader2, Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateTask } from "@/hooks/use-tasks";

// Client-side validation schema matching the backend requirements
const formSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters"),
  dateOfJoin: z.string().min(1, "Date of Join is required"),
  taskDate: z.string().min(1, "Task Date is required"),
  description: z.string().min(10, "Please provide a more detailed description (min 10 chars)"),
  secretCode: z.string().min(1, "Authorization secret code is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTaskModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createTask = useCreateTask();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      dateOfJoin: "",
      taskDate: format(new Date(), "yyyy-MM-dd"), // Default to today
      description: "",
      secretCode: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createTask.mutate(values, {
      onSuccess: () => {
        toast({
          title: "Task Added Successfully",
          description: "Your daily work has been logged.",
          variant: "default",
        });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Authorization Failed",
          description: error.message,
          variant: "destructive",
        });
        // Clear secret code on failure so they can try again
        form.setValue("secretCode", "");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-6">
          <Plus className="w-5 h-5 mr-2" />
          Log Daily Work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <div className="bg-primary/10 px-6 py-6 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-foreground flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              Add New Task
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Record your daily work. You will need the correct authorization code to submit this form.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">Company Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. Acme Corp" className="pl-9 rounded-lg border-muted-foreground/20 focus-visible:ring-primary/50" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="dateOfJoin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Date of Join</FormLabel>
                      <FormControl>
                        <Input type="date" className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary/50 text-foreground" {...field} />
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
                        <Input type="date" className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary/50 text-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">Work Description</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea 
                          placeholder="What did you work on today?" 
                          className="min-h-[100px] pl-9 rounded-lg resize-none border-muted-foreground/20 focus-visible:ring-primary/50" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-border mt-6">
                <FormField
                  control={form.control}
                  name="secretCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-semibold flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-destructive" />
                        Authorization Code
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your secret access code" 
                          className="border-destructive/30 focus-visible:ring-destructive/30 rounded-lg text-lg tracking-widest font-mono"
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Only authorized members can log work to this tracker.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="rounded-lg"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTask.isPending}
                  className="rounded-lg bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  {createTask.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Submit Task"
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
