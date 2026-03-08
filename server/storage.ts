import { tasks, type Task, type InsertTask } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: number, status: "in_progress" | "completed"): Promise<Task>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTaskStatus(id: number, status: "in_progress" | "completed"): Promise<Task> {
    const updates = {
      status,
      completedAt: status === "completed" ? new Date() : null,
    };
    const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return task;
  }
}

export const storage = new DatabaseStorage();
