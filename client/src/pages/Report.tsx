import { motion } from "framer-motion";
import { ArrowLeft, Building2, CheckCircle2, FileText, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useTasks } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function Report() {
  const { data: tasks, isLoading, isError } = useTasks();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-12 w-32 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 bg-card p-6 rounded-xl border border-border/50">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Could not load report</h2>
          <Link href="/">
            <Button variant="outline">Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Group tasks by company
  const groupedByCompany = tasks ? Object.groupBy(tasks, (task) => task.companyName) : {};
  const companies = Object.entries(groupedByCompany).sort((a, b) => 
    b[1].length - a[1].length // Sort by task count (most tasks first)
  );

  const totalTasks = tasks?.length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background elements */}
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-accent/5 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground">Work Report</h1>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-card border border-border/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Tasks Logged</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalTasks}</p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-card border border-border/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Companies</p>
                <p className="text-3xl font-bold text-foreground mt-1">{companies.length}</p>
              </div>
              <div className="p-3 bg-secondary/10 text-secondary-foreground rounded-lg">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card border border-border/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Avg. Tasks/Company</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {companies.length > 0 ? (totalTasks / companies.length).toFixed(1) : "0"}
                </p>
              </div>
              <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24">
        {companies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-dashed border-border/60"
          >
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <BarChart3 className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-foreground mb-2">No tasks yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Add tasks to generate your work report. Your report will show all tasks organized by company.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {companies.map(([company, companyTasks], idx) => {
              const sortedTasks = [...companyTasks].sort((a, b) => 
                new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime()
              );

              return (
                <motion.div
                  key={company}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                >
                  <Card className="overflow-hidden border-border/50">
                    <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-display text-xl font-bold text-foreground">{company}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {companyTasks.length} task{companyTasks.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground border-none">
                          {companyTasks.length} tasks
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="divide-y divide-border/40">
                        {sortedTasks.map((task) => {
                          const safeFormatDate = (dateStr: string | null | undefined, fmt: string) => {
                            if (!dateStr) return "N/A";
                            try {
                              return format(parseISO(dateStr), fmt);
                            } catch {
                              return dateStr;
                            }
                          };

                          return (
                            <div key={task.id} className="py-4 first:pt-4 last:pb-4">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                    Task Date: {safeFormatDate(task.taskDate, "MMM d, yyyy")}
                                  </p>
                                </div>
                                <div className="text-xs text-muted-foreground/70">
                                  {safeFormatDate(task.createdAt?.toString(), "MMM d")}
                                </div>
                              </div>
                              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-primary/20">
                                {task.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
