import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.tasks.list.path, async (req, res) => {
    const allTasks = await storage.getTasks();
    res.json(allTasks);
  });

  app.post(api.tasks.create.path, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      
      const expectedCode = process.env.SECRET_CODE || "task123";
      
      if (input.secretCode !== expectedCode) {
        return res.status(401).json({ message: "Invalid secret code" });
      }
      
      const { secretCode, ...insertTask } = input;
      const task = await storage.createTask(insertTask);
      
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
