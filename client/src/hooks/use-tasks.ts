import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTaskInput, type TasksListResponse, type TaskResponse } from "@shared/routes";

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
      const res = await fetch(api.tasks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      return parseWithLogging<TasksListResponse>(api.tasks.list.responses[200], data, "tasks.list");
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      // Validate input before sending
      const validated = api.tasks.create.input.parse(data);
      
      const res = await fetch(api.tasks.create.path, {
        method: api.tasks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
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
      return parseWithLogging<TaskResponse>(api.tasks.create.responses[201], responseData, "tasks.create");
    },
    onSuccess: () => {
      // Invalidate and refetch tasks list to show the newly added task
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}
