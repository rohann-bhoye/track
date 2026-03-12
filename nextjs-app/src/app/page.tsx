"use client";

import { motion } from "framer-motion";
import { ClipboardList, Building2, Briefcase, SearchX, BarChart3, Lock } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

import { useTasks } from "@/hooks/use-tasks";
import { CompanyCard } from "@/components/CompanyCard";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { type Task } from "@/shared/schema";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);
  const [masterCode, setMasterCode] = useState("");
  const { data: tasks, isLoading, isError } = useTasks();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { toast } = useToast();
  // Handle mounting and session persistence (with 1-hour expiry)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("master_unlocked");
    const unlockTime = localStorage.getItem("master_unlock_time");
    
    if (saved === "true" && unlockTime) {
      const oneHour = 60 * 60 * 1000; // 3,600,000 ms
      const isExpired = Date.now() - parseInt(unlockTime) > oneHour;
      
      if (isExpired) {
        localStorage.removeItem("master_unlocked");
        localStorage.removeItem("master_unlock_time");
        setIsMasterUnlocked(false);
      } else {
        setIsMasterUnlocked(true);
      }
    }
  }, []);

  const handleUnlock = () => {
    if (masterCode === "task123") {
      setIsMasterUnlocked(true);
      localStorage.setItem("master_unlocked", "true");
      localStorage.setItem("master_unlock_time", Date.now().toString());
      toast({ title: "Welcome back, Rohan", description: "Dashboard unlocked successfully." });
    } else {
      toast({ title: "Access Denied", description: "Invalid master code.", variant: "destructive" });
      setMasterCode("");
    }
  };

  // Group tasks by company - Moved to top level to satisfy Rules of Hooks
  const groupedByCompany = useMemo(() => {
    if (!tasks) return {};
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (!groups[task.companyName]) {
        groups[task.companyName] = [];
      }
      groups[task.companyName].push(task);
    });
    return groups;
  }, [tasks]);

  const companyEntries = useMemo(() => 
    Object.entries(groupedByCompany).sort((a, b) => b[1].length - a[1].length),
    [groupedByCompany]
  );

  // Avoid hydration mismatch by rendering a consistent initial state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <HeroSectionSkeleton />
      </div>
    );
  }

  if (!isMasterUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        <div className="fixed bottom-0 right-0 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border/50 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">Master Dashboard</h1>
              <p className="text-muted-foreground text-sm max-w-[280px]">
                Enter your secure master code to access the full professional dashboard.
              </p>
            </div>
            
            <div className="w-full space-y-4 pt-4">
              <Input 
                type="password" 
                placeholder="Master Code" 
                className="text-center text-2xl tracking-[0.5em] font-mono h-16 rounded-2xl border-primary/20 focus:border-primary/50 bg-muted/30"
                value={masterCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMasterCode(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleUnlock()}
              />
              <Button 
                onClick={handleUnlock}
                className="w-full h-14 font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
              >
                Access Dashboard
                <ClipboardList className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-40">
              Rohan Bhoye Professional Utility
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show a beautifully staggered skeleton loader
  if (isLoading) {
// ... existing loader code ...
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
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-bold text-foreground text-balance leading-tight tracking-tight">
              Rohan Bhoye <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Task</span> Dashboard
            </h1>
            <p className="mt-6 text-xl text-muted-foreground/80 text-balance leading-relaxed">
              Organize your professional contributions across multiple companies. 
              Secure, localized, and beautifully visualized.
            </p>
            <div className="mt-6 space-y-1">
              <p className="text-primary font-bold tracking-wide uppercase text-sm">
                Caves Studio - Digital marketing Assistance
              </p>
              <p className="text-foreground/80 font-bold text-lg">
                BucketStudy X BucketStudy Studio Founder
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0 pt-4 md:pt-0">
            <CreateTaskModal />
          </div>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-8 border-b border-border/50 mb-12 gap-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-bold text-foreground">Active Companies</h2>
            <Badge variant="outline" className="ml-2 font-mono font-bold bg-muted/30">
              {companyEntries.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {hasTasks && (
              <Link href="/report" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-11 rounded-xl font-bold w-full sm:w-auto">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Detailed Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Company Grid */}
        {!hasTasks ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-[2.5rem] border border-dashed border-border/60 shadow-sm"
          >
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
              <Briefcase className="w-12 h-12 text-primary/40" />
            </div>
            <h3 className="text-3xl font-display font-bold text-foreground mb-4">No companies found</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10 leading-relaxed">
              Your dashboard is currently empty. Start by logging your first work entry to see your professional summary here.
            </p>
            <CreateTaskModal />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {companyEntries.map(([name, tasks], idx) => (
              <CompanyCard key={name} name={name} tasks={tasks} index={idx} />
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
