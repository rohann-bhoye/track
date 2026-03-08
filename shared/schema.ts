import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  dateOfJoin: text("date_of_join").notNull(),
  taskDate: text("task_date").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });

export const createTaskRequestSchema = insertTaskSchema.extend({
  secretCode: z.string().min(1, "Secret code is required"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type TaskResponse = Task;
export type TasksListResponse = Task[];