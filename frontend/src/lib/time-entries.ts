/**
 * Time entry management via Backend API
 */

import { apiFetch } from './api';
import { singleFlight } from './single-flight';
import type { ApiTimeEntry } from './types/api';
import type { BackfillResult, buildBackfillPayload } from './backfill-hours';

export type TimeEntry = {
  id: string;
  userId?: string;
  start: string; // ISO string
  end?: string; // ISO string
  durationMin?: number;
  notes?: string;
};

function isApiTimeEntry(data: unknown): data is ApiTimeEntry {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const entry = data as Partial<ApiTimeEntry>;
  return typeof entry.id === 'string'
    && typeof entry.start === 'string'
    && !Number.isNaN(new Date(entry.start).getTime());
}

// Helper to correctly map backend fields
// NOTE: Prisma schema uses `start`/`end` (not startTime/endTime)
// `duration` is stored in minutes by the server (authoritative)
const mapBackendToFrontend = (data: ApiTimeEntry): TimeEntry => {
  // Prefer server-calculated duration, fall back to client calculation
  const durationMin = data.duration != null
    ? data.duration
    : (data.end ? Math.round((new Date(data.end).getTime() - new Date(data.start).getTime()) / 60000) : undefined);
  return {
    id: data.id,
    userId: data.userId,
    start: data.start,
    end: data.end || undefined,
    notes: data.notes,
    durationMin
  };
}

/**
 * Fetch time entries, throwing when the server refuses or fails (the payroll
 * calendar shows that with a retry instead of an empty grid).
 * @param startDate - ISO string for range start (inclusive)
 * @param endDate - ISO string for range end (inclusive)
 * @param userId - Optional: target a specific user (for admin/manager views)
 */
export async function fetchTimeEntriesOrThrow(startDate?: string, endDate?: string, userId?: string): Promise<TimeEntry[]> {
  const query = new URLSearchParams();
  if (startDate) query.append('start', startDate);
  if (endDate) query.append('end', endDate);
  if (userId) query.append('userId', userId);

  // apiFetch throws with the server's message on any non-2xx response.
  const res = await apiFetch(`/payroll/time-entries?${query.toString()}`);
  if (res.status !== 200) throw new Error(`Could not load time entries (status ${res.status})`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('Could not load time entries (unexpected response)');
  return data.filter(isApiTimeEntry).map(mapBackendToFrontend);
}

/**
 * Fetch time entries, or an empty list on any failure. For surfaces that treat
 * time entries as optional (useTimeEntriesQuery); the payroll calendar uses
 * fetchTimeEntriesOrThrow.
 */
export async function fetchTimeEntries(startDate?: string, endDate?: string, userId?: string): Promise<TimeEntry[]> {
  try {
    return await fetchTimeEntriesOrThrow(startDate, endDate, userId);
  } catch (error) {
    console.error('Failed to fetch time entries:', error);
    return [];
  }
}

/**
 * Fetch the current user's open clock entry without loading historical payroll rows.
 */
export async function fetchActiveTimeEntry(): Promise<TimeEntry | null> {
  try {
    const res = await apiFetch('/payroll/time-entries/active');
    if (res.status === 200) {
      const data = await res.json();
      return isApiTimeEntry(data) ? mapBackendToFrontend(data) : null;
    }
  } catch (error) {
    console.error('Failed to fetch active time entry:', error);
  }
  return null;
}

/**
 * Clock In: returns the new TimeEntry, or throws with the server's error message.
 * Concurrent calls (double click, two mounted clocks) share one request.
 */
export const clockIn = singleFlight(requestClockIn);

async function requestClockIn(): Promise<TimeEntry | null> {
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
 * Clock Out: returns the closed TimeEntry, or throws with the server's error message.
 * Concurrent calls share one request; the server also answers a duplicate with the closed entry.
 */
export const clockOut = singleFlight(requestClockOut);

async function requestClockOut(): Promise<TimeEntry | null> {
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
export async function createTimeEntry(start: string, end?: string, notes?: string, userId?: string): Promise<TimeEntry | null> {
  try {
    const payload = { start, end, notes, userId };
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
 * Update manual entry
 */
export async function updateTimeEntry(id: string, start: string, end?: string, notes?: string, userId?: string): Promise<TimeEntry | null> {
  try {
    const payload = { start, end, notes, userId };
    const res = await apiFetch(`/payroll/entry/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (res.status === 200) {
      const data = await res.json();
      return mapBackendToFrontend(data);
    }
  } catch (error) {
    console.error('Update entry failed:', error);
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
 * Backfill hours for past days (payroll roles only). With dryRun the server
 * answers the same shape without writing. Throws with the server's message on
 * any non-2xx response (apiFetch).
 */
export async function backfillHours(payload: ReturnType<typeof buildBackfillPayload>): Promise<BackfillResult> {
  const res = await apiFetch('/payroll/entries/backfill', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
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

