import { format, parseISO } from "date-fns";
import { Building2, Calendar, CalendarDays, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TaskResponse } from "@shared/routes";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TaskRowProps {
  task: TaskResponse;
}

export function TaskRow({ task }: TaskRowProps) {
  const [secretCode, setSecretCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const safeFormatDate = (dateStr: string | null | undefined, fmt: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), fmt);
    } catch {
      return dateStr;
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "in_progress" | "completed") => {
      return apiRequest("PATCH", `/api/tasks/${task.id}/status`, {
        status: newStatus,
        secretCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
      setShowCodeInput(false);
      setSecretCode("");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update task status";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = async (newStatus: "in_progress" | "completed") => {
    if (!secretCode) {
      setShowCodeInput(true);
      return;
    }
    await updateStatusMutation.mutateAsync(newStatus);
  };

  const isCompleted = task.status === "completed";
  const isUpdating = updateStatusMutation.isPending;

  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-lg hover:shadow-md transition-shadow group">
      {/* Status Badge/Toggle */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={() => handleStatusChange("in_progress")}
              disabled={isUpdating}
              data-testid="button-revert-status"
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </Button>
            <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
              Completed
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              onClick={() => handleStatusChange("completed")}
              disabled={isUpdating}
              data-testid="button-complete-status"
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </Button>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
              In Progress
            </Badge>
          </div>
        )}
      </div>

      {/* Company & Dates */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h3 className="font-semibold text-foreground truncate">{task.companyName}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Joined: {safeFormatDate(task.dateOfJoin, "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            <span>Task: {safeFormatDate(task.taskDate, "MMM d, yyyy")}</span>
          </div>
          {isCompleted && task.completedAt && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Completed: {safeFormatDate(task.completedAt?.toString(), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex-grow min-w-0 px-4 py-3 bg-muted/30 rounded-md border-l-2 border-primary/20">
        <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-2 group-hover:line-clamp-none">
          {task.description}
        </p>
      </div>

      {/* Logged Time */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-muted-foreground/70">
          Logged: {safeFormatDate(task.createdAt?.toString(), "MMM d")}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {safeFormatDate(task.createdAt?.toString(), "h:mm a")}
        </p>
      </div>

      {/* Secret Code Input */}
      {showCodeInput && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <input
            type="password"
            placeholder="Code"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            className="px-3 py-2 h-9 text-sm border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleStatusChange(task.status === "completed" ? "in_progress" : "completed");
              }
            }}
            data-testid="input-secret-code"
          />
          <Button
            size="sm"
            onClick={() => handleStatusChange(task.status === "completed" ? "in_progress" : "completed")}
            disabled={isUpdating || !secretCode}
            data-testid="button-confirm-code"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
          </Button>
        </div>
      )}
    </div>
  );
}
