import { motion } from "framer-motion";
import { ClipboardList, ListTodo, SearchX } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { TaskRow } from "@/components/TaskRow";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function TaskList() {
  const { data: tasks, isLoading, isError } = useTasks();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <SearchX className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground">Could not load tasks</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            There was a problem connecting to the server. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const hasTasks = tasks && tasks.length > 0;
  const sortedTasks = hasTasks
    ? [...tasks].sort((a, b) => new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime())
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />

      {/* Header */}
      <header className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4 border border-primary/20">
              <ListTodo className="w-4 h-4" />
              <span>Task Checklist</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground">
              Your Daily Tasks
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your work progress and mark tasks complete as you finish them
            </p>
          </div>

          <div className="flex-shrink-0">
            <CreateTaskModal />
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24">
        {!hasTasks ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-dashed border-border/60 shadow-sm"
          >
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <ClipboardList className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-foreground mb-2">
              No tasks yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Create your first task to get started. Each task tracks your progress from creation to completion.
            </p>
            <CreateTaskModal />
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Header Row */}
            <div className="hidden md:flex gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
              <div className="w-32 flex-shrink-0">Status</div>
              <div className="flex-grow min-w-0">Company & Details</div>
              <div className="flex-grow min-w-0">Description</div>
              <div className="w-24 flex-shrink-0 text-right">Logged</div>
            </div>

            {/* Task Rows */}
            {sortedTasks.map((task, idx) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <TaskRow task={task} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
