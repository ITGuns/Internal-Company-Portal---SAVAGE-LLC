/**
 * React Query hooks for tasks.
 * Uses 'tasks' query key — automatically invalidated when
 * the backend emits a data:changed event for this resource.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasks,
  fetchTasksPaginated,
  createTask,
  updateTask,
  deleteTask,
  fetchUsers,
  fetchDepartments,
  type Task,
  type CreateTaskPayload,
  type UpdateTaskPayload,
  type TaskUser,
  type TaskDepartment,
} from '@/lib/tasks';

const TASKS_KEY = ['tasks'] as const;
const USERS_KEY = ['users'] as const;
const DEPARTMENTS_KEY = ['departments'] as const;

export function useTasks(departmentId?: string, assigneeId?: number | string) {
  return useQuery({
    queryKey: [...TASKS_KEY, departmentId, assigneeId],
    queryFn: () => fetchTasks(departmentId, assigneeId),
  });
}

export function useTasksPaginated(page: number, limit: number) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'paginated', page, limit],
    queryFn: () => fetchTasksPaginated(page, limit),
    placeholderData: (prev) => prev,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // users change infrequently
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: fetchDepartments,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskPayload }) => updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
