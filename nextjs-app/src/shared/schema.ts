import { z } from "zod";

export const screenshotGroupSchema = z.object({
  folderName: z.string(),
  urls: z.array(z.string()),
});

export type ScreenshotGroup = z.infer<typeof screenshotGroupSchema>;

// Pure Zod schema — no drizzle-orm dependency (app uses Firebase, not Postgres)
export const insertTaskSchema = z.object({
  companyName: z.string().min(1),
  dateOfJoin: z.string().optional(),
  taskDate: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default("in_list"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  proofLink: z.string().nullable().optional(),
  proofLinks: z.array(z.string()).optional(),
  screenshotGroups: z.array(screenshotGroupSchema).optional(),
  nextWeekPlan: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
});

// Full Task shape as stored in / returned from Firebase
export const taskSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  dateOfJoin: z.string().optional(),
  taskDate: z.string(),
  description: z.string().optional(),
  status: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  proofLink: z.string().nullable().optional(),
  proofLinks: z.array(z.string()).optional(),
  screenshotGroups: z.array(screenshotGroupSchema).optional(),
  createdAt: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  originalDate: z.string().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
  nextWeekPlan: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  boardFolder: z.string().optional().nullable(),
});

export const createTasksBulkRequestSchema = z.object({
  companyName: z.string().min(2, "Company name is too short! Even 'Apple' has 5 letters 🍎"),
  dateOfJoin: z.string().optional(),
  taskDate: z.string().min(1, "When did you do this? Time travel isn't supported yet ⏳"),
  tasks: z.array(z.object({
    description: z.string().optional(),
    status: z.enum(["in_list", "in_progress", "review", "completed", "holiday", "leave", "go_for_change", "dont_go"]).default("in_list"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    proofLink: z.string().optional(),
    proofLinks: z.array(z.string()).optional(),
    screenshotGroups: z.array(screenshotGroupSchema).optional(),
    nextWeekPlan: z.string().optional(), 
    assignee: z.string().optional(),
    boardFolder: z.string().optional(),
  })).min(1, "You didn't do any work? You must add at least one task! 🛌"),
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export type CreateTasksBulkRequest = z.infer<typeof createTasksBulkRequestSchema>;

export const verifyCodeSchema = z.object({
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export const updateNextWeekPlanSchema = z.object({
  companyName: z.string().min(1, "Which company is this strategy for? 🏢"),
  taskDate: z.string().min(1, "Pick a date for this strategy 📅"),
  nextWeekPlan: z.string().min(1, "Don't leave the strategy blank! 🚀"),
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export type UpdateNextWeekPlanRequest = z.infer<typeof updateNextWeekPlanSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.enum(["in_list", "in_progress", "review", "completed", "holiday", "leave", "go_for_change", "dont_go"]).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  taskDate: z.string().optional(),
  dateOfJoin: z.string().optional(),
  description: z.string().optional(),
  proofLink: z.string().nullable().optional(),
  proofLinks: z.array(z.string()).optional(),
  screenshotGroups: z.array(screenshotGroupSchema).optional(),
  boardFolder: z.string().nullable().optional(),
  nextWeekPlan: z.string().nullable().optional(),
  originalDate: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export const boardFolderSchema = z.object({
  id: z.string().or(z.number()),
  name: z.string().min(1, "What should we call this project? 📁"),
  companyName: z.string().min(1, "Which company is this for? 🏢"),
  createdAt: z.coerce.date().nullable().optional(),
});

export const insertBoardFolderSchema = boardFolderSchema.omit({ id: true, createdAt: true });

export const boardFoldersSchema = z.array(boardFolderSchema);

export const deleteTaskRequestSchema = z.object({
  secretCode: z.string().min(1, "Hold up! We need the secret passkey to let you in 🛑"),
});

export type Task = z.infer<typeof taskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type BoardFolder = z.infer<typeof boardFolderSchema>;
export type InsertBoardFolder = z.infer<typeof insertBoardFolderSchema>;
export type UpdateTaskStatusRequest = z.infer<typeof updateTaskStatusSchema>;
export type TaskResponse = Task;
export type TasksListResponse = Task[];

// Members (for team board)
export const memberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Member name is required"),
  companyName: z.string().min(1, "Company name is required"),
  gender: z.enum(["male", "female"]).optional(),
  createdAt: z.coerce.date().nullable().optional(),
});

export const insertMemberSchema = memberSchema.omit({ id: true, createdAt: true });

export type Member = z.infer<typeof memberSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;

