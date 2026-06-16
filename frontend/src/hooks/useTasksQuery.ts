/**
 * React Query hooks for tasks.
 * Uses 'tasks' query key — automatically invalidated when
 * the backend emits a data:changed event for this resource.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasks,
  fetchTasksPaginated,
  fetchTaskDetail,
  createTask,
  updateTask,
  deleteTask,
  fetchTaskProjects,
  createTaskProject,
  updateTaskProject,
  deleteTaskProject,
  fetchUsers,
  fetchDepartments,
  type CreateTaskPayload,
  type UpdateTaskPayload,
  type CreateTaskProjectPayload,
  type UpdateTaskProjectPayload,
} from '@/lib/tasks';

const TASKS_KEY = ['tasks'] as const;
const TASK_PROJECTS_KEY = ['task-projects'] as const;
const USERS_KEY = ['users'] as const;
const DEPARTMENTS_KEY = ['departments'] as const;

interface UseTasksOptions {
  enabled?: boolean;
}

export function useTasks(departmentId?: string, assigneeId?: number | string, options: UseTasksOptions = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, departmentId, assigneeId],
    queryFn: () => fetchTasks(departmentId, assigneeId),
    enabled: options.enabled ?? true,
  });
}

export function useTasksPaginated(page: number, limit: number) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'paginated', page, limit],
    queryFn: () => fetchTasksPaginated(page, limit),
    placeholderData: (prev) => prev,
  });
}

export function useTaskDetail(taskId?: string, options: UseTasksOptions = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'detail', taskId],
    queryFn: () => fetchTaskDetail(taskId as string),
    enabled: Boolean(taskId) && (options.enabled ?? true),
  });
}

export function useTaskProjects() {
  return useQuery({
    queryKey: TASK_PROJECTS_KEY,
    queryFn: fetchTaskProjects,
    staleTime: 2 * 60 * 1000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: TASK_PROJECTS_KEY });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskPayload }) => updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: TASK_PROJECTS_KEY });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: TASK_PROJECTS_KEY });
    },
  });
}

export function useCreateTaskProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskProjectPayload) => createTaskProject(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateTaskProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskProjectPayload }) => updateTaskProject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useDeleteTaskProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTaskProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}
