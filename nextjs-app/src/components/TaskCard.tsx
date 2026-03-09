import { format, parseISO } from "date-fns";
import { Building2, Calendar, CalendarDays, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Task } from "@/shared/routes";
import { motion } from "framer-motion";

interface TaskCardProps {
  task: Task;
  index: number;
}

export function TaskCard({ task, index }: TaskCardProps) {
  // Format dates gracefully with fallbacks
  const safeFormatDate = (dateStr: string | null | undefined, fmt: string) => {
    if (!dateStr) return "N/A";
    try {
      // Try parsing standard ISO format or fallback to returning the string directly if it fails
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
      <Card className="h-full overflow-hidden border-border/50 bg-card hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 group flex flex-col">
        <CardHeader className="bg-muted/30 pb-4 border-b border-border/40 relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground line-clamp-1">
                {task.companyName}
              </h3>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="secondary" className="font-medium bg-secondary/50 text-secondary-foreground border-none">
              <Calendar className="w-3 h-3 mr-1.5" />
              Joined: {safeFormatDate(task.dateOfJoin, "MMM d, yyyy")}
            </Badge>
            <Badge variant="outline" className="font-medium bg-background border-border text-muted-foreground">
              <CalendarDays className="w-3 h-3 mr-1.5" />
              Task: {safeFormatDate(task.taskDate, "MMM d, yyyy")}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-5 flex-grow flex flex-col">
          <div className="flex items-start gap-2 mb-2 text-muted-foreground">
            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
            <h4 className="text-sm font-semibold uppercase tracking-wider">Work Description</h4>
          </div>
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap flex-grow pl-6 border-l-2 border-primary/10 group-hover:border-primary/30 transition-colors">
            {task.description}
          </p>
          
          <div className="flex items-center gap-1.5 mt-6 text-xs text-muted-foreground/70">
            <Clock className="w-3 h-3" />
            <span>Logged on {safeFormatDate(task.createdAt?.toString(), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
