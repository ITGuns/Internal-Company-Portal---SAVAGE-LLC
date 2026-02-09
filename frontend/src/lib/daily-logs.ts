/**
 * Daily Logs Storage Library
 * Manages daily work logs, tasks completed, and progress tracking with localStorage persistence
 */

import { getItem, setItem } from './storage';

export type LogStatus = 'completed' | 'in-progress' | 'blocked';

export interface LogTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface DailyLog {
  id: string;
  author: string;
  authorId: string;
  department: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: string; // Full ISO timestamp
  status: LogStatus;
  hoursLogged: number;
  tasks: LogTask[];
  likes: string[]; // Array of user IDs who liked
  comments: number; // Comment count
}

const STORAGE_KEY = 'daily_logs';

/**
 * Load all daily logs from localStorage
 */
export function loadDailyLogs(): DailyLog[] {
  return getItem<DailyLog[]>(STORAGE_KEY, []);
}

/**
 * Save daily logs to localStorage
 */
export function saveDailyLogs(logs: DailyLog[]): void {
  setItem(STORAGE_KEY, logs);
}

/**
 * Add a new daily log
 */
export function addDailyLog(
  author: string,
  authorId: string,
  department: string,
  date: string,
  hoursLogged: number,
  tasks: LogTask[],
  status: LogStatus = 'in-progress'
): DailyLog {
  const logs = loadDailyLogs();
  const newLog: DailyLog = {
    id: `log-${Date.now()}`,
    author,
    authorId,
    department,
    date,
    timestamp: new Date().toISOString(),
    status,
    hoursLogged,
    tasks,
    likes: [],
    comments: 0,
  };

  logs.unshift(newLog); // Add to beginning
  saveDailyLogs(logs);
  return newLog;
}

/**
 * Update an existing daily log
 */
export function updateDailyLog(id: string, updates: Partial<Omit<DailyLog, 'id'>>): void {
  const logs = loadDailyLogs();
  const index = logs.findIndex(log => log.id === id);

  if (index !== -1) {
    logs[index] = { ...logs[index], ...updates };
    saveDailyLogs(logs);
  }
}

/**
 * Delete a daily log
 */
export function deleteDailyLog(id: string): void {
  const logs = loadDailyLogs();
  const filtered = logs.filter(log => log.id !== id);
  saveDailyLogs(filtered);
}

/**
 * Toggle like on a daily log
 */
export function toggleLogLike(logId: string, userId: string = 'current-user'): void {
  const logs = loadDailyLogs();
  const log = logs.find(l => l.id === logId);

  if (log) {
    const likeIndex = log.likes.indexOf(userId);
    if (likeIndex > -1) {
      log.likes.splice(likeIndex, 1);
    } else {
      log.likes.push(userId);
    }
    saveDailyLogs(logs);
  }
}

/**
 * Get logs filtered by date range
 */
export function getLogsByDateRange(startDate: string, endDate: string): DailyLog[] {
  const logs = loadDailyLogs();
  return logs.filter(log => log.date >= startDate && log.date <= endDate);
}

/**
 * Get logs for a specific department
 */
export function getLogsByDepartment(department: string): DailyLog[] {
  const logs = loadDailyLogs();
  return logs.filter(log => log.department === department);
}

/**
 * Get logs for a specific user
 */
export function getLogsByUser(authorId: string): DailyLog[] {
  const logs = loadDailyLogs();
  return logs.filter(log => log.authorId === authorId);
}

/**
 * Get logs by status
 */
export function getLogsByStatus(status: LogStatus): DailyLog[] {
  const logs = loadDailyLogs();
  return logs.filter(log => log.status === status);
}

/**
 * Get logs for today
 */
export function getTodayLogs(): DailyLog[] {
  const today = new Date().toISOString().slice(0, 10);
  return getLogsByDateRange(today, today);
}

/**
 * Get logs for this week
 */
export function getThisWeekLogs(): DailyLog[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return getLogsByDateRange(
    startOfWeek.toISOString().slice(0, 10),
    endOfWeek.toISOString().slice(0, 10)
  );
}

/**
 * Get total completed tasks count for a log
 */
export function getCompletedTasksCount(log: DailyLog): number {
  return log.tasks.filter(task => task.completed).length;
}

/**
 * Format date for display
 */
export function formatLogDate(date: string): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return d.toLocaleDateString('en-US', options);
}

/**
 * Get available departments from existing logs
 */
export function getUniqueDepartments(): string[] {
  const logs = loadDailyLogs();
  const departments = logs.map(log => log.department);
  return Array.from(new Set(departments)).sort();
}

/**
 * Get available users from existing logs
 */
export function getUniqueUsers(): Array<{ id: string; name: string }> {
  const logs = loadDailyLogs();
  const usersMap = new Map<string, string>();
  
  logs.forEach(log => {
    usersMap.set(log.authorId, log.author);
  });

  return Array.from(usersMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
