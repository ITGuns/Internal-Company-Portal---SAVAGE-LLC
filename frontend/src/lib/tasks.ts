/**
 * Task storage management
 */

import { getItem, setItem, removeItem } from './storage';

export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'Low' | 'Med' | 'High';

export type Task = {
  id: string;
  title: string;
  subtitle?: string;
  assignee?: string;
  when?: string; // Due date as string
  priority?: TaskPriority;
  department?: string;
  role?: string;
  notes?: { text: string; date: string }[];
  status: TaskStatus;
};

export type TasksByStatus = Record<TaskStatus, Task[]>;

const TASKS_KEY = 'tasks_by_status';
const TASK_VIEW_KEY = 'task_view_preference';

/**
 * Load tasks from localStorage
 */
export function loadTasks(): TasksByStatus {
  return getItem<TasksByStatus>(TASKS_KEY, {
    todo: [],
    inprogress: [],
    review: [],
    done: [],
  });
}

/**
 * Save tasks to localStorage
 */
export function saveTasks(tasks: TasksByStatus): boolean {
  return setItem(TASKS_KEY, tasks);
}

/**
 * Add a new task to a specific status column
 */
export function addTask(task: Task): TasksByStatus {
  const tasks = loadTasks();
  tasks[task.status] = [task, ...tasks[task.status]];
  saveTasks(tasks);
  return tasks;
}

/**
 * Update an existing task
 */
export function updateTask(taskId: string, updates: Partial<Task>): TasksByStatus {
  const tasks = loadTasks();
  
  // Find the task in all status columns
  for (const status of Object.keys(tasks) as TaskStatus[]) {
    const index = tasks[status].findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const updatedTask = { ...tasks[status][index], ...updates };
      
      // If status changed, move to new column
      if (updates.status && updates.status !== status) {
        tasks[status].splice(index, 1);
        tasks[updates.status] = [updatedTask, ...tasks[updates.status]];
      } else {
        tasks[status][index] = updatedTask;
      }
      
      saveTasks(tasks);
      break;
    }
  }
  
  return tasks;
}

/**
 * Delete a task
 */
export function deleteTask(taskId: string): TasksByStatus {
  const tasks = loadTasks();
  
  for (const status of Object.keys(tasks) as TaskStatus[]) {
    tasks[status] = tasks[status].filter((t) => t.id !== taskId);
  }
  
  saveTasks(tasks);
  return tasks;
}

/**
 * Move a task to a different status
 */
export function moveTask(taskId: string, newStatus: TaskStatus): TasksByStatus {
  return updateTask(taskId, { status: newStatus });
}

/**
 * Get all tasks as a flat array
 */
export function getAllTasks(): Task[] {
  const tasks = loadTasks();
  return [
    ...tasks.todo,
    ...tasks.inprogress,
    ...tasks.review,
    ...tasks.done,
  ];
}

/**
 * Get tasks for the current week
 */
export function getThisWeekTasks(): {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
} {
  const tasks = loadTasks();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  const allTasks = getAllTasks();
  
  // Filter tasks for this week (based on 'when' field)
  const thisWeekTasks = allTasks.filter((task) => {
    if (!task.when) return false;
    const taskDate = new Date(task.when);
    return taskDate >= weekStart && taskDate < weekEnd;
  });
  
  const completed = tasks.done.length;
  const inProgress = tasks.inprogress.length;
  
  // Overdue: tasks not done with due date in the past
  const overdue = allTasks.filter((task) => {
    if (!task.when || task.status === 'done') return false;
    const taskDate = new Date(task.when);
    return taskDate < today;
  }).length;
  
  return {
    total: thisWeekTasks.length,
    completed,
    inProgress,
    overdue,
  };
}

/**
 * Clear all tasks
 */
export function clearTasks(): boolean {
  return removeItem(TASKS_KEY);
}

/**
 * Get saved view preference
 */
export function getTaskViewPreference(): 'grid' | 'list' | 'calendar' {
  return getItem<'grid' | 'list' | 'calendar'>(TASK_VIEW_KEY, 'calendar');
}

/**
 * Save view preference
 */
export function saveTaskViewPreference(view: 'grid' | 'list' | 'calendar'): boolean {
  return setItem(TASK_VIEW_KEY, view);
}
