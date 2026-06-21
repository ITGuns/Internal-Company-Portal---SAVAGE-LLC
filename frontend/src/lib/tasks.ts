/**
 * Task API Client
 */

import { apiFetch } from './api';
import type { PaginatedResponse } from './types/pagination';
import type { ApiTask, ApiTaskProject } from './types/api';

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
  role?: string | null;
  roles?: Array<{
    role: string;
    departmentId?: string | null;
    department?: TaskDepartment | null;
  }>;
}

export interface TaskDepartment {
  id: string;
  name: string;
  availableRoles?: Array<{
    id: string;
    name: string;
    departmentId?: string | null;
  }>;
}

export type TaskProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface TaskProject {
  id: string;
  name: string;
  description?: string | null;
  status: TaskProjectStatus;
  color?: string | null;
  departmentId?: string | null;
  ownerId?: string | null;
  createdById?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  department?: Pick<TaskDepartment, 'id' | 'name'> | null;
  owner?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'> | null;
  creator?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'> | null;
  members?: TaskProjectMember[];
  taskCount?: number;
}

export interface TaskProjectMember {
  id: string;
  projectId: string;
  userId: string;
  addedById?: string | null;
  status: 'active' | string;
  createdAt?: string;
  updatedAt?: string;
  user?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'>;
  addedBy?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'> | null;
}

export interface TaskWorkSession {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt?: string;
  user?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'>;
}

export interface TaskCollaborator {
  id: string;
  taskId: string;
  userId: string;
  invitedById?: string | null;
  status: 'invited' | 'accepted' | 'declined' | string;
  createdAt?: string;
  updatedAt?: string;
  user?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'>;
  invitedBy?: Pick<TaskUser, 'id' | 'name' | 'email' | 'avatar'> | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string; // Was subtitle
  status: TaskStatus;
  priority: TaskPriority;

  departmentId?: string;
  department?: TaskDepartment;
  projectId?: string | null;
  project?: TaskProject | null;

  assigneeId?: number | string;
  assigneeIds?: string[];
  assignee?: TaskUser;
  createdById?: number | string;
  creator?: TaskUser;
  collaborators?: TaskCollaborator[];

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
  completedAt?: string;
  workSessions?: TaskWorkSession[];

  createdAt?: string;
  updatedAt?: string;
}

export type TaskDetail = Task & {
  workSessions: TaskWorkSession[];
};

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentId: string;
  assigneeId?: number | string;
  projectId?: string | null;
  assigneeIds?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  role?: string;
  notes?: TaskNote[];
  estimatedTime?: number;
  collaboratorIds?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentId?: string;
  assigneeId?: number | string;
  projectId?: string | null;
  assigneeIds?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  role?: string;
  notes?: TaskNote[];

  progress?: number;
  timerStatus?: 'playing' | 'paused' | 'stopped';
  timerStart?: string;
  totalElapsed?: number;
  estimatedTime?: number;
  collaboratorIds?: string[];
}

export interface CreateTaskProjectPayload {
  name: string;
  description?: string | null;
  status?: TaskProjectStatus;
  color?: string | null;
  departmentId?: string | null;
  ownerId?: string | null;
  memberIds?: string[];
  startDate?: string | null;
  targetDate?: string | null;
}

export type UpdateTaskProjectPayload = Partial<CreateTaskProjectPayload> & {
  completedAt?: string | null;
};

/**
 * Fetch all tasks
 */
export async function fetchTasks(departmentId?: string, assigneeId?: number | string): Promise<Task[]> {
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

/**
 * Fetch tasks with pagination
 */
export async function fetchTasksPaginated(page: number, limit: number): Promise<PaginatedResponse<Task>> {
  const res = await apiFetch(`/tasks?page=${page}&limit=${limit}`);
  if (!res.ok) {
    throw new Error('Failed to fetch tasks');
  }
  const json = await res.json();
  return {
    ...json,
    data: json.data.map(processTaskFromApi),
  };
}

export async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  const res = await apiFetch(`/tasks/${taskId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch task details');
  }
  const task = processTaskFromApi(await res.json());
  return {
    ...task,
    workSessions: task.workSessions || [],
  };
}

function processTaskFromApi(task: ApiTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    departmentId: task.departmentId,
    department: task.department,
    projectId: task.projectId ?? null,
    project: task.project ? processTaskProjectFromApi(task.project) : null,
    assigneeId: task.assigneeId,
    assigneeIds: Array.isArray(task.assigneeIds)
      ? task.assigneeIds.map((assigneeId) => String(assigneeId))
      : undefined,
    assignee: task.assignee,
    createdById: task.createdById as number | string | undefined,
    creator: task.creator as TaskUser | undefined,
    collaborators: Array.isArray(task.collaborators)
      ? task.collaborators.map((collaborator) => ({
          id: collaborator.id,
          taskId: collaborator.taskId,
          userId: collaborator.userId,
          invitedById: collaborator.invitedById ?? null,
          status: collaborator.status,
          createdAt: collaborator.createdAt,
          updatedAt: collaborator.updatedAt,
          user: collaborator.user,
          invitedBy: collaborator.invitedBy ?? null,
        }))
      : [],
    role: task.role,
    progress: task.progress,
    timerStatus: task.timerStatus as Task['timerStatus'],
    timerStart: task.timerStart,
    totalElapsed: task.totalElapsed,
    estimatedTime: task.estimatedTime,
    completedAt: task.completedAt as string | undefined,
    createdAt: task.createdAt as string | undefined,
    updatedAt: task.updatedAt as string | undefined,
    workSessions: Array.isArray(task.workSessions)
      ? task.workSessions.map((session) => ({
          id: session.id,
          taskId: session.taskId,
          userId: session.userId,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          durationSeconds: session.durationSeconds || 0,
          createdAt: session.createdAt,
          user: session.user,
        }))
      : undefined,
    // Ensure status matches our enum (handle potential drift)
    status: (['todo', 'in_progress', 'review', 'completed'].includes(task.status)
      ? task.status
      : 'todo') as TaskStatus,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
    startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : undefined,
    notes: Array.isArray(task.notes) ? task.notes : [],
    priority: (task.priority || 'Med') as TaskPriority,
  };
}

function normalizeProjectStatus(status: string): TaskProjectStatus {
  return (['active', 'paused', 'completed', 'archived'].includes(status)
    ? status
    : 'active') as TaskProjectStatus;
}

function normalizeOptionalDate(value?: string | null): string | null | undefined {
  if (value === null) return null;
  if (!value) return undefined;
  return new Date(value).toISOString().split('T')[0];
}

export function processTaskProjectFromApi(project: ApiTaskProject): TaskProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: normalizeProjectStatus(project.status),
    color: project.color ?? null,
    departmentId: project.departmentId ?? null,
    ownerId: project.ownerId ?? null,
    createdById: project.createdById ?? null,
    startDate: normalizeOptionalDate(project.startDate),
    targetDate: normalizeOptionalDate(project.targetDate),
    completedAt: project.completedAt ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    department: project.department ?? null,
    owner: project.owner ?? null,
    creator: project.creator ?? null,
    members: Array.isArray(project.members)
      ? project.members.map((member) => ({
          id: member.id,
          projectId: member.projectId,
          userId: member.userId,
          addedById: member.addedById ?? null,
          status: member.status,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          user: member.user,
          addedBy: member.addedBy ?? null,
        }))
      : [],
    taskCount: project._count?.tasks ?? 0,
  };
}

export async function fetchTaskProjects(): Promise<TaskProject[]> {
  const res = await apiFetch('/tasks/projects');
  if (!res.ok) {
    throw new Error('Failed to fetch task projects');
  }
  const projects = await res.json();
  return projects.map(processTaskProjectFromApi);
}

export async function createTaskProject(payload: CreateTaskProjectPayload): Promise<TaskProject> {
  const res = await apiFetch('/tasks/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create task project');
  }
  return processTaskProjectFromApi(await res.json());
}

export async function updateTaskProject(projectId: string, payload: UpdateTaskProjectPayload): Promise<TaskProject> {
  const res = await apiFetch(`/tasks/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update task project');
  }
  return processTaskProjectFromApi(await res.json());
}

export async function deleteTaskProject(projectId: string): Promise<void> {
  const res = await apiFetch(`/tasks/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete task project');
  }
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
    const errorText = await res.text();
    console.error('Failed to create task, backend says:', errorText);
    throw new Error(errorText || 'Failed to create task');
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
  if (typeof localStorage === 'undefined') return 'list';
  const val = localStorage.getItem(TASK_VIEW_KEY);
  if (val === 'grid' || val === 'list' || val === 'calendar') return val;
  return 'list';
}

/**
 * Save view preference
 */
export function saveTaskViewPreference(view: 'grid' | 'list' | 'calendar'): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TASK_VIEW_KEY, view);
  }
}
