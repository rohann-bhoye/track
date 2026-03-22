import { z } from 'zod';
import { taskSchema, memberSchema, createTasksBulkRequestSchema, updateTaskStatusSchema, verifyCodeSchema, insertMemberSchema } from './schema';

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
export type Member = z.infer<typeof memberSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;

