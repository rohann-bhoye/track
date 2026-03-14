import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Calendar, Briefcase, Lock } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTasks, useVerifyCode, useCreatePlan } from "@/hooks/use-tasks";
import { updateNextWeekPlanSchema, type UpdateNextWeekPlanRequest, type Task } from "@/shared/schema";
import { api } from "@/shared/routes";

export function SetNextWeekPlanModal() {
  const [open, setOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();
  const { data: tasks } = useTasks();
  const verifyCode = useVerifyCode();
  const createPlan = useCreatePlan();

  const companies = Array.from(new Set(tasks?.map((t: Task) => t.companyName) || [])).sort();

  const form = useForm<UpdateNextWeekPlanRequest>({
    resolver: zodResolver(updateNextWeekPlanSchema),
    defaultValues: {
      companyName: "",
      taskDate: new Date().toISOString().split('T')[0],
      nextWeekPlan: "",
      secretCode: "",
    },
  });

  const handleAuthorize = async () => {
    const code = form.getValues("secretCode");
    if (!code) {
      toast({ variant: "destructive", title: "Error", description: "Enter secret code" });
      return;
    }
    try {
      await verifyCode.mutateAsync(code);
      setIsAuthorized(true);
      toast({ title: "Authorized", description: "Form unlocked." });
    } catch (e) {
      // toast handled in mutate
    }
  };

  const onSubmit = async (data: UpdateNextWeekPlanRequest) => {
    try {
      await createPlan.mutateAsync(data);
      toast({
        title: "Strategy Saved! 🚀",
        description: "Your Next Week Strategy has been featured on the dashboard.",
      });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 w-full px-4"
        >
          <Sparkles className="w-4 h-4 mr-2 text-primary animate-pulse" />
          Planning
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background shadow-2xl">
        {!isAuthorized ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-primary/10">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-foreground">Personnel Only</h3>
              <p className="text-muted-foreground text-sm">Please verify the master code to update strategy.</p>
            </div>
            <div className="space-y-4">
              <Input 
                type="password" 
                placeholder="Secure Code" 
                className="text-center text-lg tracking-widest font-mono h-12 rounded-xl"
                value={form.watch("secretCode")}
                onChange={(e) => form.setValue("secretCode", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuthorize()}
              />
              <Button 
                onClick={handleAuthorize} 
                disabled={verifyCode.isPending}
                className="w-full h-12 font-bold text-base rounded-xl shadow-lg shadow-primary/20"
              >
                {verifyCode.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unlock Strategy Form"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-primary/10 px-8 py-8 border-b border-primary/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <Sparkles className="w-32 h-32 text-primary" />
                </div>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-foreground flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Next Week Strategy
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  Define the big goals for the upcoming week.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 font-bold uppercase text-[10px] tracking-[0.2em]">Company Focus</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Which brand?" 
                              className="h-11 rounded-xl border-primary/10 bg-muted/30 focus:bg-background transition-all" 
                              list="plan-company-list"
                              {...field} 
                            />
                          </FormControl>
                          <datalist id="plan-company-list">
                            {companies.map(company => (
                              <option key={company} value={company} />
                            ))}
                          </datalist>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taskDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 font-bold uppercase text-[10px] tracking-[0.2em]">Publication Date</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-11 rounded-xl border-primary/10 bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="nextWeekPlan"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-foreground/80 font-bold uppercase text-[10px] tracking-[0.2em]">The Strategy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What's the main goal? Be bold! 🚀" 
                            className="min-h-[120px] bg-muted/30 border-primary/10 rounded-2xl resize-none text-base placeholder:italic focus:bg-background transition-all"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 group overflow-hidden relative"
                    disabled={createPlan.isPending}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                       {createPlan.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Deploy Strategy"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] animate-gradient" />
                  </Button>
                </form>
              </Form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
