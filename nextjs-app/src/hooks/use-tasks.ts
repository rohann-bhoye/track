
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

export function useTasks(companyName?: string) {
  return useQuery({
    queryKey: [api.tasks.list.path, companyName],
    queryFn: async () => {
      const url = companyName ? `/api/tasks?company=${encodeURIComponent(companyName)}` : "/api/tasks";
      const res = await fetch(url);
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

export function useDeleteCompanyTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyName, secretCode }: { companyName: string, secretCode: string }) => {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyName)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid secret code.");
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Delete company failed.");
      }
      return await res.json();
    },
    onMutate: async ({ companyName }) => {
      await queryClient.cancelQueries({ queryKey: [api.tasks.list.path] });
      await queryClient.cancelQueries({ queryKey: ['/api/tasks/trash'] });

      const previousTasks = queryClient.getQueryData<Task[]>([api.tasks.list.path]);
      const previousTrash = queryClient.getQueryData<Task[]>(['/api/tasks/trash']);

      if (previousTasks) {
        const deletedTasks = previousTasks.filter(t => t.companyName === companyName);
        // Optimistically remove tasks of this company from main list
        queryClient.setQueryData<Task[]>([api.tasks.list.path], 
          previousTasks.filter(t => t.companyName !== companyName)
        );
        
        // Optimistically add to trash list
        if (previousTrash) {
          queryClient.setQueryData<Task[]>(['/api/tasks/trash'], [
            ...previousTrash,
            ...deletedTasks.map(t => ({ ...t, deletedAt: new Date().toISOString() }))
          ]);
        }
      }

      return { previousTasks, previousTrash };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([api.tasks.list.path], context.previousTasks);
      }
      if (context?.previousTrash) {
        queryClient.setQueryData(['/api/tasks/trash'], context.previousTrash);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/trash'] });
    },
  });
}

export function useTrashTasks() {
  return useQuery({
    queryKey: ['/api/tasks/trash'],
    queryFn: async () => {
      const res = await fetch("/api/tasks/trash");
      if (!res.ok) throw new Error("Failed to fetch trash tasks");
      const data = await res.json();
      return parseWithLogging<Task[]>(api.tasks.list.responses[200], data, "tasks.trash");
    },
    staleTime: 60000, // Keep data fresh for 1 minute
    gcTime: 1000 * 60 * 10, // Keep in garbage for 10 minutes
  });
}

export function useRestoreCompanyTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyName, secretCode }: { companyName: string, secretCode: string }) => {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyName)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid secret code.");
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Restore company failed.");
      }
      return await res.json();
    },
    onMutate: async ({ companyName }) => {
      await queryClient.cancelQueries({ queryKey: [api.tasks.list.path] });
      await queryClient.cancelQueries({ queryKey: ['/api/tasks/trash'] });

      const previousTasks = queryClient.getQueryData<Task[]>([api.tasks.list.path]);
      const previousTrash = queryClient.getQueryData<Task[]>(['/api/tasks/trash']);

      if (previousTrash) {
        const restoredTasks = previousTrash.filter(t => t.companyName === companyName);
        // Optimistically remove from trash list
        queryClient.setQueryData<Task[]>(['/api/tasks/trash'], 
          previousTrash.filter(t => t.companyName !== companyName)
        );
        
        // Optimistically add back to main list
        if (previousTasks) {
          queryClient.setQueryData<Task[]>([api.tasks.list.path], [
            ...previousTasks,
            ...restoredTasks.map(t => ({ ...t, deletedAt: null }))
          ]);
        }
      }

      return { previousTasks, previousTrash };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([api.tasks.list.path], context.previousTasks);
      }
      if (context?.previousTrash) {
        queryClient.setQueryData(['/api/tasks/trash'], context.previousTrash);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/trash'] });
    },
  });
}

export function usePermanentDeleteCompanyTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyName, secretCode }: { companyName: string, secretCode: string }) => {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyName)}/permanent`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretCode }),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid secret code.");
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Delete company permanently failed.");
      }
      return await res.json();
    },
    onMutate: async ({ companyName }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/tasks/trash'] });
      const previousTrash = queryClient.getQueryData<Task[]>(['/api/tasks/trash']);

      if (previousTrash) {
        queryClient.setQueryData<Task[]>(['/api/tasks/trash'], 
          previousTrash.filter(t => t.companyName !== companyName)
        );
      }
      return { previousTrash };
    },
    onError: (err, variables, context) => {
      if (context?.previousTrash) {
        queryClient.setQueryData(['/api/tasks/trash'], context.previousTrash);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/trash'] });
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save plan");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}
