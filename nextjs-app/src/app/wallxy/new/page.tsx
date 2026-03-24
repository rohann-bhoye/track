"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Send, ArrowLeft, Loader2, CheckCircle2, 
  Plus, FolderPlus
} from "lucide-react";
import Link from "next/link";
import { useCreateBoardFolder } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ClientNewFolderPage() {
  const createFolder = useCreateBoardFolder();
  const { toast } = useToast();

  const [folderName, setFolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast({ title: "Required", description: "Please enter a name for the new folder.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    createFolder.mutate({ 
      name: folderName.trim(), 
      companyName: "Wallxy" 
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({ title: "Project Created! 📁", description: `"${folderName}" has been added as a tab to the board.` });
        setTimeout(() => {
          setFolderName("");
          setIsSuccess(false);
          setIsSubmitting(false);
        }, 3000);
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ title: "Error", description: "Failed to create folder. Please try again.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-primary/10">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-indigo-50/50" />
      
      <header className="max-w-xl mx-auto pt-10 px-6 mb-8 flex items-center justify-between">
        <Link href="/wallxy">
          <Button variant="ghost" className="rounded-full gap-2 text-muted-foreground hover:text-primary transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Board
          </Button>
        </Link>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-xl border border-white/20 rounded-full shadow-sm">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-bold tracking-tight text-primary">Folder Portal</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pb-20">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-display font-bold text-slate-900 tracking-tight mb-4">
            New <span className="text-primary italic">Folder</span>
          </h1>
          <p className="text-slate-500 text-lg">Create a new tab on the board.</p>
        </div>

        <Card className="p-8 md:p-12 rounded-[2.5rem] border-white/40 bg-white/40 backdrop-blur-3xl shadow-2xl shadow-slate-200/50 border overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form 
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleSubmit}
                className="space-y-10"
              >
                {/* Folder Name */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <FolderPlus className="w-4 h-4 text-primary" />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Project / Folder Name</span>
                  </div>
                  <div className="relative group">
                    <Input 
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="e.g. Website Overhaul"
                      autoFocus
                      className="h-16 rounded-[1.25rem] border-slate-200 bg-white/50 text-xl font-medium focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                    />
                    <div className="absolute inset-0 rounded-[1.25rem] bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10" />
                  </div>
                  <p className="text-[10px] text-slate-400 italic ml-2">This folder will appear as a new tab at the top of the Wallxy Board.</p>
                </div>

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-20 rounded-[1.5rem] text-xl font-bold gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 group"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : (
                      <>
                        Create Folder <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Project Added!</h2>
                <p className="text-slate-500 text-lg max-w-sm">
                   "{folderName}" is now live on the board.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsSuccess(false)}
                  className="rounded-full px-10 h-12"
                >
                  Create Another
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </main>

      <footer className="max-w-xl mx-auto px-6 py-10 text-center">
        <p className="text-slate-400 text-sm font-medium">Wallxy Task Management System</p>
      </footer>
    </div>
  );
}
