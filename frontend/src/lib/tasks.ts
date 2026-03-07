/**
 * Task API Client
 */

import { apiFetch } from './api';
import { Department } from './departments';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'Low' | 'Med' | 'High';

export interface TaskNote {
  text: string;
  date: string;
}

export interface TaskUser {
  id: number | string;
  name: string | null;
  email: string;
  avatar: string | null;
}

export interface TaskDepartment {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string; // Was subtitle
  status: TaskStatus;
  priority: TaskPriority;

  departmentId?: string;
  department?: TaskDepartment;

  assigneeId?: number;
  assignee?: TaskUser;

  dueDate?: string; // ISO Date string (was 'when')
  startDate?: string; // ISO Date string — when the task begins
  role?: string;
  notes?: TaskNote[];

  // Timer & Progress Fields
  progress?: number; // 0-100
  timerStatus?: 'playing' | 'paused' | 'stopped';
  timerStart?: string;
  totalElapsed?: number; // in seconds
  estimatedTime?: number; // in minutes

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentId: string;
  assigneeId?: number | string;
  dueDate?: string;
  startDate?: string;
  role?: string;
  notes?: TaskNote[];
  estimatedTime?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentId?: string;
  assigneeId?: number | string;
  dueDate?: string;
  startDate?: string;
  role?: string;
  notes?: TaskNote[];

  progress?: number;
  timerStatus?: 'playing' | 'paused' | 'stopped';
  timerStart?: string;
  totalElapsed?: number;
  estimatedTime?: number;
}

/**
 * Fetch all tasks
 */
export async function fetchTasks(departmentId?: string, assigneeId?: number | string): Promise<Task[]> {
  const params = new URLSearchParams();
  let url = '/tasks';

  if (departmentId) {
    url = `/tasks/department/${departmentId}`;
  } else if (assigneeId) {
    url = `/tasks/assignee/${assigneeId}`;
  }

  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch tasks');
  }
  const tasks = await res.json();

  // Ensure dates and notes are properly formatted if needed
  return tasks.map(processTaskFromApi);
}

function processTaskFromApi(task: any): Task {
  return {
    ...task,
    // Ensure status matches our enum (handle potential drift)
    status: (['todo', 'in_progress', 'review', 'completed'].includes(task.status)
      ? task.status
      : 'todo') as TaskStatus,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
    startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : undefined,
    notes: Array.isArray(task.notes) ? task.notes : [],
    priority: task.priority || 'Med',
  };
}

/**
 * Create a new task
 */
export async function createTask(task: CreateTaskPayload): Promise<Task> {
  const res = await apiFetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) {
    throw new Error('Failed to create task');
  }
  const result = await res.json();
  return processTaskFromApi(result);
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, updates: UpdateTaskPayload): Promise<Task> {
  const res = await apiFetch(`/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error('Failed to update task');
  }
  const result = await res.json();
  return processTaskFromApi(result);
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const res = await apiFetch(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('You do not have permission to delete tasks. Only managers and admins can do this.');
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete task');
  }
}

/**
 * Helper to get tasks for the current week (synchronous calculation on already fetched tasks)
 */
export function calculateWeeklyStats(allTasks: Task[]) {
  const today = new Date();

  // Get date-only ISO strings for comparison (YYYY-MM-DD)
  const getIsoDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getIsoDateStr(today);

  // Start of current week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = getIsoDateStr(weekStart);

  // End of current week (Next Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekEndStr = getIsoDateStr(weekEnd);

  // Filter tasks for this week (based on dueDate)
  const thisWeekTasks = allTasks.filter((task) => {
    if (!task.dueDate) return false;
    // task.dueDate is already YYYY-MM-DD from processTaskFromApi
    return task.dueDate >= weekStartStr && task.dueDate < weekEndStr;
  });

  const completed = allTasks.filter(t => t.status === 'completed').length;
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length;

  // Overdue: tasks not done with due date in the past
  const overdue = allTasks.filter((task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return task.dueDate < todayStr;
  }).length;

  return {
    total: thisWeekTasks.length,
    completed,
    inProgress,
    overdue,
  };
}


/**
 * Fetch available users for assignment
 */
export async function fetchUsers(): Promise<TaskUser[]> {
  try {
    const res = await apiFetch('/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch users", err);
    return [];
  }
}

/**
 * Fetch available departments
 */
export async function fetchDepartments(): Promise<TaskDepartment[]> {
  try {
    const res = await apiFetch('/departments');
    if (!res.ok) throw new Error('Failed to fetch departments');
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch departments", err);
    return [];
  }
}

// Re-implement view preference storage (localStorage)
const TASK_VIEW_KEY = 'task_view_preference';

/**
 * Get saved view preference
 */
export function getTaskViewPreference(): 'grid' | 'list' | 'calendar' {
  if (typeof localStorage === 'undefined') return 'calendar';
  const val = localStorage.getItem(TASK_VIEW_KEY);
  if (val === 'grid' || val === 'list' || val === 'calendar') return val;
  return 'calendar';
}

/**
 * Save view preference
 */
export function saveTaskViewPreference(view: 'grid' | 'list' | 'calendar'): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TASK_VIEW_KEY, view);
  }
}
