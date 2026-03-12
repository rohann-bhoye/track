import { Building2, Calendar, LayoutList, ChevronRight, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CompanyCardProps {
  name: string;
  tasks: any[];
  index: number;
}

export function CompanyCard({ name, tasks, index }: CompanyCardProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      <Link href={`/company/${encodeURIComponent(name)}`}>
        <Card className="group cursor-pointer overflow-hidden border-border/50 bg-card hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full relative">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-0 group-hover:bg-primary/10 transition-colors" />
          
          <CardContent className="p-6 sm:p-8 relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 sm:p-4 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="text-right">
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
      </Link>
    </motion.div>
  );
}
