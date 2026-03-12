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
  originalDate: z.string().nullable().optional(),
});

export const createTasksBulkRequestSchema = z.object({
  companyName: z.string().min(2, "Company name is too short! Even 'Apple' has 5 letters 🍎"),
  dateOfJoin: z.string().min(1, "When did you join? We're not mind readers! 🧠"),
  taskDate: z.string().min(1, "When did you do this? Time travel isn't supported yet ⏳"),
  tasks: z.array(z.object({
    description: z.string().min(10, "Come on, give us a bit more detail! (at least 10 chars) 📝"),
    status: z.enum(["in_progress", "completed", "holiday", "leave"]).default("in_progress"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    proofLink: z.string().optional(),
  })).min(1, "You didn't do any work? You must add at least one task! 🛌"),
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export type CreateTasksBulkRequest = z.infer<typeof createTasksBulkRequestSchema>;

export const verifyCodeSchema = z.object({
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["in_progress", "completed", "holiday", "leave"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  taskDate: z.string().optional(),
  description: z.string().optional(),
  proofLink: z.string().optional(),
  originalDate: z.string().optional(),
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export const deleteTaskRequestSchema = z.object({
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export type Task = z.infer<typeof taskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTaskStatusRequest = z.infer<typeof updateTaskStatusSchema>;
export type TaskResponse = Task;
export type TasksListResponse = Task[];
