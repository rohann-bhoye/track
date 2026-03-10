import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full py-10 border-t border-border/40 bg-background/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-medium flex items-center justify-center gap-2">
            Created by <span className="text-foreground font-bold italic">Bucketstudy founder</span> 
            <span className="text-primary mx-1">-</span>
            <span className="text-foreground font-bold">Rohan Bhoye</span>
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
          </p>
          <p className="text-xs font-semibold text-primary/80 tracking-wide uppercase">
            Caves Studio - Digital marketing Assistance
          </p>
          <p className="text-sm font-bold text-foreground/90 pt-1">
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
