import { useState } from "react";
import { Building2, Calendar, LayoutList, ChevronRight, Activity, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDeleteCompanyTasks } from "@/hooks/use-tasks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyCardProps {
  name: string;
  tasks: any[];
  index: number;
}

export function CompanyCard({ name, tasks, index }: CompanyCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const deleteMutation = useDeleteCompanyTasks();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [secretCode, setSecretCode] = useState("");

  const latestTask = tasks[0];
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  const safeFormatDate = (dateStr: string | null | undefined, fmt: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), fmt);
    } catch {
      return dateStr;
    }
  };

  const handleDelete = async () => {
    if (!secretCode) {
      toast({ title: "Error", description: "Secret code is required.", variant: "destructive" });
      return;
    }
    
    deleteMutation.mutate(
      { companyName: name, secretCode },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Company and all tasks deleted." });
          setShowDeleteDialog(false);
          setSecretCode("");
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      <Card 
        className="group cursor-pointer overflow-hidden border-border/50 bg-card hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full relative"
        onClick={() => router.push(`/company/${encodeURIComponent(name)}`)}
      >
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-0 group-hover:bg-primary/10 transition-colors" />
          
          <CardContent className="p-6 sm:p-8 relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 sm:p-4 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="text-right flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                <Badge variant="outline" className={cn(
                  "rounded-full px-3 py-1 font-bold border-2",
                  latestTask?.status === "completed" 
                    ? "bg-green-50 text-green-600 border-green-200" 
                    : "bg-amber-50 text-amber-600 border-amber-200"
                )}>
                  {latestTask?.status === "completed" ? "Done" : "Active"}
                </Badge>
              </div>
            </div>
          </div>

            <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {name}
            </h3>

            <div className="flex flex-wrap gap-3 mt-2 mb-8">
              <span className="flex items-center text-xs font-medium text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Joined {safeFormatDate(latestTask?.dateOfJoin, "MMM yyyy")}
              </span>
              <span className="flex items-center text-xs font-medium text-muted-foreground">
                <LayoutList className="w-3.5 h-3.5 mr-1.5" />
                {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>

            <div className="mt-auto space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs px-1">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    Overall Completion
                  </span>
                  <span className="font-mono text-primary font-bold">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-primary flex items-center group-hover:gap-2 transition-all">
                  Open Records 
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
                <p className="text-[10px] text-muted-foreground font-medium">Last updated {safeFormatDate(latestTask?.taskDate, "MMM d")}</p>
              </div>
            </div>
          </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete Company?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{name}</strong> and all of its {tasks.length} tasks. This action cannot be undone.
              Please enter the master code to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input 
              type="password"
              placeholder="Enter master code"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              className="font-mono text-center tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDelete();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setSecretCode(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
              disabled={deleteMutation.isPending || !secretCode}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
