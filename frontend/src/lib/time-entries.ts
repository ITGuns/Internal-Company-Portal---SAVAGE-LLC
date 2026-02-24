/**
 * Time entry management via Backend API
 */

import { apiFetch } from './api';

export type TimeEntry = {
  id: string;
  start: string; // ISO string
  end?: string; // ISO string
  durationMin?: number;
  notes?: string;
};


// Helper to correctly map backend fields
// NOTE: Prisma schema uses `start`/`end` (not startTime/endTime)
// `duration` is stored in minutes by the server (authoritative)
const mapBackendToFrontend = (data: any): TimeEntry => {
  // Prefer server-calculated duration, fall back to client calculation
  const durationMin = data.duration != null
    ? data.duration
    : (data.end ? Math.round((new Date(data.end).getTime() - new Date(data.start).getTime()) / 60000) : undefined);
  return {
    id: data.id,
    start: data.start,
    end: data.end || undefined,
    notes: data.notes,
    durationMin
  };
}

/**
 * Fetch time entries from API
 * @param startDate - ISO string for range start
 * @param endDate - ISO string for range end
 * @param userId - Optional: target a specific user (for admin/manager views)
 */
export async function fetchTimeEntries(startDate?: string, endDate?: string, userId?: string): Promise<TimeEntry[]> {
  try {
    const query = new URLSearchParams();
    if (startDate) query.append('start', startDate);
    if (endDate) query.append('end', endDate);
    if (userId) query.append('userId', userId);

    const res = await apiFetch(`/payroll/time-entries?${query.toString()}`);
    if (res.status === 200) {
      const data = await res.json();
      return data.map(mapBackendToFrontend);
    }
  } catch (error) {
    console.error('Failed to fetch time entries:', error);
  }
  return [];
}

/**
 * Clock In — returns the new TimeEntry, or throws with the server's error message
 */
export async function clockIn(): Promise<TimeEntry | null> {
  try {
    const res = await apiFetch('/payroll/clock-in', { method: 'POST' });
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      return mapBackendToFrontend(data);
    }
    // Non-2xx that didn't throw (e.g. 400 Already clocked in)
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Clock in failed (${res.status})`);
  } catch (error) {
    console.error('Clock in failed:', error);
    throw error; // Re-throw so callers can show the real message
  }
}

/**
 * Clock Out — returns the updated TimeEntry, or throws with the server's error message
 */
export async function clockOut(): Promise<TimeEntry | null> {
  try {
    const res = await apiFetch('/payroll/clock-out', { method: 'POST' });
    if (res.status === 200) {
      const data = await res.json();
      return mapBackendToFrontend(data);
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Clock out failed (${res.status})`);
  } catch (error) {
    console.error('Clock out failed:', error);
    throw error;
  }
}

/**
 * Add manual entry
 */
export async function createTimeEntry(start: string, end?: string, notes?: string): Promise<TimeEntry | null> {
  try {
    const payload = { start, end, notes };
    const res = await apiFetch('/payroll/entry', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      return mapBackendToFrontend(data);
    }
  } catch (error) {
    console.error('Create entry failed:', error);
  }
  return null;
}

/**
 * Delete time entry
 */
export async function deleteTimeEntry(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/payroll/entry/${id}`, { method: 'DELETE' });
    return res.status === 200;
  } catch (error) {
    console.error('Delete entry failed:', error);
    return false;
  }
}

/**
 * Get active entry (frontend helper on fetched data)
 */
export function getActiveEntry(entries: TimeEntry[]): TimeEntry | undefined {
  // Sort by start desc
  const sorted = [...entries].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  // The most recent one if it has no end time
  if (sorted.length > 0 && !sorted[0].end) {
    return sorted[0];
  }
  return undefined;
}

/**
 * Calculate total minutes for a specific date (frontend helper)
 */
export function getTotalMinutesForDate(entries: TimeEntry[], date: string): number {
  const dayEntries = entries.filter((e) => e.start.startsWith(date));

  return dayEntries.reduce((acc, e) => {
    const end = e.end ? new Date(e.end) : new Date(); // If running, calculate til now
    const start = new Date(e.start);
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    return acc + minutes;
  }, 0);
}

// Deprecated (removed implementations)
export const loadTimeEntries = fetchTimeEntries;
export const addTimeEntry = createTimeEntry;
export const getActiveTimeEntry = () => null; // Cannot be sync anymore

