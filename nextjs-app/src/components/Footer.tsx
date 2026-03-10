import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full py-8 md:py-10 border-t border-border/40 bg-background/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs md:text-sm font-medium flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            Created by <span className="text-foreground font-bold italic">Bucketstudy founder</span> 
            <span className="text-primary hidden md:inline">-</span>
            <span className="text-foreground font-bold">Rohan Bhoye</span>
            <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive fill-destructive" />
          </p>
          <p className="text-[10px] md:text-xs font-semibold text-primary/80 tracking-wide uppercase">
            Caves Studio - Digital marketing Assistance
          </p>
          <p className="text-xs md:text-sm font-bold text-foreground/90 pt-1">
            Bucketstudy X BucketStudy Studio Founder
          </p>
        </div>
        <div className="pt-2">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">
            © {new Date().getFullYear()} Work Tracker • Premium Professional Edition
          </p>
        </div>
      </div>
    </footer>
  );
}
