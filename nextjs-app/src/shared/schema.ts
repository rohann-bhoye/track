import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  dateOfJoin: text("date_of_join").notNull(),
  taskDate: text("task_date").notNull(),
  description: text("description").notNull(),
  status: text("status").default("in_progress"), // "in_progress" | "completed"
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true, 
  completedAt: true 
});

export const createTasksBulkRequestSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters"),
  dateOfJoin: z.string().min(1, "Date of Join is required"),
  taskDate: z.string().min(1, "Task Date is required"),
  tasks: z.array(z.object({
    description: z.string().min(10, "Please provide a more detailed description (min 10 chars)"),
    status: z.enum(["in_progress", "completed"]).default("in_progress"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).min(1, "At least one task is required"),
  secretCode: z.string().min(1, "Secret code is required"),
});

export type CreateTasksBulkRequest = z.infer<typeof createTasksBulkRequestSchema>;

export const verifyCodeSchema = z.object({
  secretCode: z.string().min(1, "Secret code is required"),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["in_progress", "completed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  taskDate: z.string().optional(),
  description: z.string().optional(),
  secretCode: z.string().min(1, "Secret code is required"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTaskStatusRequest = z.infer<typeof updateTaskStatusSchema>;
export type TaskResponse = Task;
export type TasksListResponse = Task[];
