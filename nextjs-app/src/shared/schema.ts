import { z } from "zod";

// Pure Zod schema — no drizzle-orm dependency (app uses Firebase, not Postgres)
export const insertTaskSchema = z.object({
  companyName: z.string().min(1),
  dateOfJoin: z.string().min(1),
  taskDate: z.string().min(1),
  description: z.string().min(1),
  status: z.string().default("in_progress"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  proofLink: z.string().nullable().optional(),
});

// Full Task shape as stored in / returned from Firebase
export const taskSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  dateOfJoin: z.string(),
  taskDate: z.string(),
  description: z.string(),
  status: z.string().nullable(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  proofLink: z.string().nullable().optional(),
  createdAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
});

export const createTasksBulkRequestSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters"),
  dateOfJoin: z.string().min(1, "Date of Join is required"),
  taskDate: z.string().min(1, "Task Date is required"),
  tasks: z.array(z.object({
    description: z.string().min(10, "Please provide a more detailed description (min 10 chars)"),
    status: z.enum(["in_progress", "completed", "holiday", "leave"]).default("in_progress"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    proofLink: z.string().optional(),
  })).min(1, "At least one task is required"),
  secretCode: z.string().min(1, "Secret code is required"),
});

export type CreateTasksBulkRequest = z.infer<typeof createTasksBulkRequestSchema>;

export const verifyCodeSchema = z.object({
  secretCode: z.string().min(1, "Secret code is required"),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["in_progress", "completed", "holiday", "leave"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  taskDate: z.string().optional(),
  description: z.string().optional(),
  proofLink: z.string().optional(),
  secretCode: z.string().min(1, "Secret code is required"),
});

export const deleteTaskRequestSchema = z.object({
  secretCode: z.string().min(1, "Secret code is required"),
});

export type Task = z.infer<typeof taskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTaskStatusRequest = z.infer<typeof updateTaskStatusSchema>;
export type TaskResponse = Task;
export type TasksListResponse = Task[];
