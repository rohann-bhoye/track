import { useState, useMemo } from "react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { Trash2, RefreshCcw, AlertTriangle, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTrashTasks, useRestoreCompanyTasks, usePermanentDeleteCompanyTasks } from "@/hooks/use-tasks";
import { type Task } from "@/shared/schema";

export function TrashModal() {
  const [open, setOpen] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const { toast } = useToast();
  
  const { data: trashTasks, isLoading } = useTrashTasks();
  const restoreMutation = useRestoreCompanyTasks();
  const permanentDeleteMutation = usePermanentDeleteCompanyTasks();

  // Group trashed tasks by company
  const groupedByCompany = useMemo(() => {
    if (!trashTasks) return {};
    const groups: Record<string, Task[]> = {};
    trashTasks.forEach((task: Task) => {
      if (!groups[task.companyName]) {
        groups[task.companyName] = [];
      }
      groups[task.companyName].push(task);
    });
    return groups;
  }, [trashTasks]);

  const companyEntries = useMemo(() => 
    Object.entries(groupedByCompany).map(([name, tasks]) => {
      // Find the most recently deleted task to determine days left
      const latestDeleted = tasks.reduce((latest, current) => {
        if (!current.deletedAt) return latest;
        if (!latest) return current.deletedAt;
        return new Date(current.deletedAt) > new Date(latest) ? current.deletedAt : latest;
      }, null as string | Date | null);

      let daysLeft = 15;
      if (latestDeleted) {
        const daysSinceDelete = differenceInDays(new Date(), new Date(latestDeleted));
        daysLeft = Math.max(0, 15 - daysSinceDelete);
      }

      return { name, taskCount: tasks.length, daysLeft };
    }).sort((a, b) => a.daysLeft - b.daysLeft),
    [groupedByCompany]
  );

  const handleRestore = (companyName: string) => {
    if (!secretCode) {
      toast({ title: "Error", description: "Master code required.", variant: "destructive" });
      return;
    }
    restoreMutation.mutate({ companyName, secretCode }, {
      onSuccess: () => toast({ title: "Restored", description: `${companyName} has been restored.` }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handlePermanentDelete = (companyName: string) => {
    if (!secretCode) {
      toast({ title: "Error", description: "Master code required.", variant: "destructive" });
      return;
    }
    permanentDeleteMutation.mutate({ companyName, secretCode }, {
      onSuccess: () => toast({ title: "Deleted", description: `${companyName} permanently deleted.` }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 w-full px-4"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Trash {companyEntries.length > 0 && `(${companyEntries.length})`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-border/50 shadow-2xl rounded-2xl max-h-[85vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="pb-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-2xl font-display">
            <Trash2 className="w-6 h-6 text-destructive" />
            Recycle Bin
          </DialogTitle>
          <DialogDescription>
            Items here will be permanently deleted after 15 days. Enter your master code to restore or delete immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex-shrink-0">
          <Input 
            type="password"
            placeholder="Enter master code to authorize actions"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            className="font-mono text-center tracking-widest h-12"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {isLoading && !trashTasks ? (
            <div className="flex justify-center p-6 sm:p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : companyEntries.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground flex flex-col items-center">
              <Trash2 className="w-12 h-12 mb-4 opacity-20" />
              <p>The recycle bin is empty.</p>
            </div>
          ) : (
            companyEntries.map((company) => (
              <div key={company.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-card gap-4">
                <div>
                  <h4 className="font-bold text-lg mb-1">{company.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{company.taskCount} tasks</span>
                    <span className="flex items-center text-amber-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      {company.daysLeft} days left
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 sm:flex-none h-9 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={() => handleRestore(company.name)}
                    disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Restore
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 sm:flex-none h-9 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={() => handlePermanentDelete(company.name)}
                    disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
