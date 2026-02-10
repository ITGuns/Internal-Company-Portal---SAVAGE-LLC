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

// Mapper
const mapApiEntry = (data: any): TimeEntry => ({
  id: data.id,
  start: data.startTime, // Backend uses startTime field name in Prisma? Let's check Service.
  // Actually, let's assume standard names or map them.
  // Controller calls `service.addManualEntry(userId, start, end, notes)`.
  // Prisma model usually has `startTime`, `endTime`.
  // Let's verify backend model or response.
  // Phase 1 verification showed responses.
  // In `API_TESTING_GUIDE.md`, TimeEntry response:
  // { "id": "...", "startTime": "...", "endTime": "...", "notes": "..." }
  // So backend uses startTime/endTime.
  end: data.endTime,
  durationMin: data.durationMinutes, // calculate or from backend?
  // The backend might not return durationMinutes if it's dynamic.
  // Frontend calculates it usually.
  // Let's stick to start/end and calculate duration in frontend if needed.
  notes: data.notes
});

// Helper to correctly map backend fields
const mapBackendToFrontend = (data: any): TimeEntry => {
  return {
    id: data.id,
    start: data.startTime,
    end: data.endTime || undefined,
    notes: data.notes,
    durationMin: data.endTime ? Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000) : undefined
  };
}

/**
 * Fetch time entries from API
 */
export async function fetchTimeEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
  try {
    const query = new URLSearchParams();
    if (startDate) query.append('start', startDate);
    if (endDate) query.append('end', endDate);

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
 * Clock In
 */
export async function clockIn(): Promise<TimeEntry | null> {
  try {
    const res = await apiFetch('/payroll/clock-in', { method: 'POST' });
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      return mapBackendToFrontend(data);
    }
  } catch (error) {
    console.error('Clock in failed:', error);
  }
  return null;
}

/**
 * Clock Out
 */
export async function clockOut(): Promise<TimeEntry | null> {
  try {
    const res = await apiFetch('/payroll/clock-out', { method: 'POST' });
    if (res.status === 200) {
      const data = await res.json();
      return mapBackendToFrontend(data);
    }
  } catch (error) {
    console.error('Clock out failed:', error);
  }
  return null;
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

