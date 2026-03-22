"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, UserPlus, Loader2, User } from "lucide-react";
import { insertMemberSchema, type InsertMember } from "@/shared/schema";
import { useCreateTeamMember } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateMemberModal({ companyName = "Caves Studio" }: { companyName?: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createMember = useCreateTeamMember();

  const form = useForm<InsertMember>({
    resolver: zodResolver(insertMemberSchema),
    defaultValues: {
      name: "",
      companyName,
    },
  });

  const onSubmit = (data: InsertMember) => {
    createMember.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Member Added",
          description: `${data.name} has been added to the team.`,
        });
        setOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add member.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 h-12 px-6"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
        <div className="bg-primary/10 px-6 py-6 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              New Team Member
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Add a new member to the Caves Studio team board.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">Member Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Developer 1" 
                        className="h-11 rounded-xl border-muted-foreground/20 focus:border-primary/50" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">Team</FormLabel>
                    <FormControl>
                      <Input 
                        readOnly
                        className="h-11 rounded-xl border-muted-foreground/20 bg-muted/50 cursor-not-allowed text-muted-foreground" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="rounded-xl h-11 px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMember.isPending}
                  className="rounded-xl h-11 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold"
                >
                  {createMember.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
