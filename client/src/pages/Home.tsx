import { motion } from "framer-motion";
import { ClipboardList, LayoutGrid, LayoutList, ListTodo, SearchX, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

import { useTasks } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/TaskCard";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: tasks, isLoading, isError } = useTasks();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Show a beautifully staggered skeleton loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <HeroSectionSkeleton />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col space-y-3 bg-card p-6 rounded-xl border border-border/50 shadow-sm">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-[150px] rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-[100px] rounded-full" />
                  <Skeleton className="h-5 w-[100px] rounded-full" />
                </div>
                <Skeleton className="h-[80px] w-full rounded-lg mt-4" />
                <Skeleton className="h-4 w-[120px] rounded-lg mt-2" />
              </div>
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
  
  // Sort tasks by taskDate descending (newest first) natively since we are relying on frontend for sorting simple arrays
  const sortedTasks = hasTasks ? [...tasks].sort((a, b) => {
    return new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime();
  }) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      
      {/* Header/Hero Area */}
      <header className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 border border-primary/20">
              <ClipboardList className="w-4 h-4" />
              <span>Personal Workspace</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground text-balance leading-tight">
              Your Daily <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-foreground">Task Tracker</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-balance">
              Keep a beautiful, secure log of your daily contributions across different companies. 
              Only authorized personnel can add entries.
            </p>
          </div>
          
          <div className="flex-shrink-0 pt-4 md:pt-0">
            <CreateTaskModal />
          </div>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between py-6 border-b border-border/50 mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
            <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full ml-2">
              {tasks?.length || 0}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {hasTasks && (
              <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`px-3 py-1.5 h-8 ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Grid
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`px-3 py-1.5 h-8 ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="w-4 h-4 mr-2" />
                  List
                </Button>
              </div>
            )}
            {hasTasks && (
              <Link href="/report">
                <Button variant="outline" size="sm" className="h-8">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Task Grid/List */}
        {!hasTasks ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-dashed border-border/60 shadow-sm"
          >
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <ClipboardList className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-foreground mb-2">No tasks logged yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Your tracker is empty. Click the "Log Daily Work" button above to securely add your first task entry.
            </p>
            <CreateTaskModal />
          </motion.div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-4"
          }>
            {sortedTasks.map((task, idx) => (
              <TaskCard key={task.id} task={task} index={idx} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function HeroSectionSkeleton() {
  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 w-full max-w-2xl">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-16 w-3/4 rounded-xl" />
          <Skeleton className="h-16 w-1/2 rounded-xl" />
          <Skeleton className="h-6 w-5/6 max-w-md rounded-lg mt-4" />
        </div>
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>
      <div className="mt-16 h-[1px] w-full bg-border/50" />
    </div>
  );
}
