/**
 * Daily Logs Library
 * Manages daily work logs via Backend API
 */

import { apiFetch } from './api';

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

// Helper to map API data to Frontend interface
const mapApiLog = (data: any): DailyLog => {
  return {
    id: data.id,
    author: data.author?.name || 'Unknown',
    authorId: data.authorId,
    department: data.department,
    date: data.date, // Backend returns YYYY-MM-DD string? Or Date string? Controller says 'date' from body. Prisma stores as DateTime. 
    // If Prisma returns Date object, JSON stringify makes it ISO string.
    // The frontend expects YYYY-MM-DD for checking.
    // Let's assume ISO string and substring it if needed.
    // Actually Prisma DateTime is full ISO.
    // Frontend 'date' field is used for 'YYYY-MM-DD' comparison.
    // I should format it to YYYY-MM-DD.
    timestamp: data.createdAt,
    status: data.status as LogStatus,
    hoursLogged: data.hoursLogged || 0,
    tasks: data.tasks || [],
    likes: data.likes?.map((l: any) => l.userId || l.user?.id) || [],
    comments: 0 // Backend doesn't return comments count or list in findAll yet? 
    // Using `include` in service: `likes` included. `comments` NOT included in `findAll` of service.
    // I should assume 0 for now or update backend. 
    // The frontend interface has `comments: number`.
  };
};

/**
 * Fetch all daily logs from API
 */
export async function fetchDailyLogs(department?: string, status?: string): Promise<DailyLog[]> {
  try {
    const query = new URLSearchParams();
    if (department) query.append('department', department);
    if (status) query.append('status', status);

    const res = await apiFetch(`/daily-logs?${query.toString()}`);
    if (res.status === 200) {
      const data = await res.json();
      return data.map((item: any) => {
        const mapped = mapApiLog(item);
        // Ensure date is YYYY-MM-DD
        if (mapped.date.includes('T')) {
          mapped.date = mapped.date.split('T')[0];
        }
        return mapped;
      });
    }
  } catch (error) {
    console.error('Failed to fetch daily logs:', error);
  }
  return [];
}

/**
 * Add a new daily log
 */
export async function createDailyLog(
  department: string,
  date: string,
  hoursLogged: number,
  tasks: LogTask[],
  status: LogStatus = 'in-progress'
): Promise<DailyLog | null> {
  try {
    const payload = {
      content: `Daily Log - ${date}`, // Generated content
      department,
      date: new Date(date).toISOString(), // Send as ISO
      hoursLogged,
      tasks, // Send JSON
      status
    };

    const res = await apiFetch('/daily-logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      const data = await res.json();
      const mapped = mapApiLog(data);
      if (mapped.date.includes('T')) mapped.date = mapped.date.split('T')[0];
      return mapped;
    }
  } catch (error) {
    console.error('Failed to create daily log:', error);
  }
  return null;
}

/**
 * Update an existing daily log
 */
export async function updateDailyLog(id: string, updates: Partial<Omit<DailyLog, 'id'>>): Promise<DailyLog | null> {
  try {
    const payload: any = {};
    if (updates.department) payload.department = updates.department;
    if (updates.date) payload.date = new Date(updates.date).toISOString();
    if (updates.hoursLogged !== undefined) payload.hoursLogged = updates.hoursLogged;
    if (updates.tasks) payload.tasks = updates.tasks;
    if (updates.status) payload.status = updates.status;

    const res = await apiFetch(`/daily-logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (res.status === 200) {
      const data = await res.json();
      const mapped = mapApiLog(data);
      if (mapped.date.includes('T')) mapped.date = mapped.date.split('T')[0];
      return mapped;
    }
  } catch (error) {
    console.error('Failed to update daily log:', error);
  }
  return null;
}

/**
 * Delete a daily log
 */
export async function deleteDailyLog(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/daily-logs/${id}`, {
      method: 'DELETE',
    });
    return res.status === 200;
  } catch (error) {
    console.error('Failed to delete daily log:', error);
    return false;
  }
}

/**
 * Toggle like on a daily log
 */
export async function toggleLogLike(logId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/daily-logs/${logId}/like`, {
      method: 'POST',
    });
    if (res.status === 200) {
      const data = await res.json();
      return data.liked;
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
  }
  return false;
}

// Helpers requiring data input now

/**
 * Get logs filtered by date range
 */
export function getLogsByDateRange(logs: DailyLog[], startDate: string, endDate: string): DailyLog[] {
  return logs.filter(log => log.date >= startDate && log.date <= endDate);
}

/**
 * Get logs for a specific department
 */
export function getLogsByDepartment(logs: DailyLog[], department: string): DailyLog[] {
  return logs.filter(log => log.department === department);
}

/**
 * Get logs for a specific user
 */
export function getLogsByUser(logs: DailyLog[], authorId: string): DailyLog[] {
  return logs.filter(log => log.authorId === authorId);
}

/**
 * Get logs by status
 */
export function getLogsByStatus(logs: DailyLog[], status: LogStatus): DailyLog[] {
  return logs.filter(log => log.status === status);
}

/**
 * Get logs for today
 */
export function getTodayLogs(logs: DailyLog[]): DailyLog[] {
  const today = new Date().toISOString().slice(0, 10);
  return getLogsByDateRange(logs, today, today);
}

/**
 * Get logs for this week
 */
export function getThisWeekLogs(logs: DailyLog[]): DailyLog[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return getLogsByDateRange(
    logs,
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
  if (!date) return '';
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
export function getUniqueDepartments(logs: DailyLog[]): string[] {
  const departments = logs.map(log => log.department);
  return Array.from(new Set(departments)).sort();
}

/**
 * Get available users from existing logs
 */
export function getUniqueUsers(logs: DailyLog[]): Array<{ id: string; name: string }> {
  const usersMap = new Map<string, string>();

  logs.forEach(log => {
    usersMap.set(log.authorId, log.author);
  });

  return Array.from(usersMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Deprecated functions (signatures kept for reference but removed implementation/export)
export const loadDailyLogs = fetchDailyLogs;
export const addDailyLog = createDailyLog;

