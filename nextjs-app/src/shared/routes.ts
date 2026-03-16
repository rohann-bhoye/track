import { z } from 'zod';
import { createTasksBulkRequestSchema, updateTaskStatusSchema, verifyCodeSchema } from './schema';

// Plain Zod shape for Task — avoids importing drizzle-orm (Node.js-only) into the client bundle
const taskSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  dateOfJoin: z.string(),
  taskDate: z.string(),
  description: z.string(),
  status: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  proofLink: z.string().nullable().optional(),
  createdAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  originalDate: z.string().nullable().optional(),
  nextWeekPlan: z.string().nullable().optional(),
});


export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    verifyCode: {
      method: 'POST' as const,
      path: '/api/verify-code' as const,
      input: verifyCodeSchema,
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks' as const,
      responses: {
        200: z.array(taskSchema),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tasks' as const,
      input: createTasksBulkRequestSchema,
      responses: {
        201: z.array(taskSchema),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id' as const,
      input: updateTaskStatusSchema,
      responses: {
        200: taskSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tasks/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CreateTasksBulkRequest = z.infer<typeof api.tasks.create.input>;
export type Task = z.infer<typeof api.tasks.create.responses[201]>[number];
export type TaskResponse = z.infer<typeof api.tasks.create.responses[201]>;
export type TasksListResponse = z.infer<typeof api.tasks.list.responses[200]>;
