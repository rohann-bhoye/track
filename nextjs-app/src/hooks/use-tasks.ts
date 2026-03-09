
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Task, type CreateTasksBulkRequest, api, buildUrl } from "@/shared/routes";

function parseWithLogging<T>(schema: any, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw new Error(`Data validation failed for ${label}`);
  }
  return result.data as T;
}

export function useTasks() {
  return useQuery({
    queryKey: [api.tasks.list.path],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      return parseWithLogging<Task[]>(api.tasks.list.responses[200], data, "tasks.list");
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTasksBulkRequest) => {
      // Validate input before sending
      const validated = api.tasks.create.input.parse(data);
      
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid secret code. You are not authorized to add tasks.");
        }
        if (res.status === 400) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Validation failed on the server.");
        }
        throw new Error("An unexpected error occurred while creating the task.");
      }
      
      const responseData = await res.json();
      return parseWithLogging<Task[]>(api.tasks.create.responses[201], responseData, "tasks.create");
    },
    onSuccess: () => {
      // Invalidate and refetch tasks list to show the newly added task
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates, secretCode }: { id: string, updates: Partial<Task>, secretCode: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, secretCode }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid secret code.");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Update failed.");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}

export function useVerifyCode() {
  return useMutation({
    mutationFn: async (secretCode: string) => {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Invalid secret code");
      }

      return res.json() as Promise<{ success: boolean }>;
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, secretCode }: { id: string, secretCode: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid secret code.");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Delete failed.");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}
