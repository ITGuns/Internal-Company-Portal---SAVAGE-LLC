/**
 * Time entry storage management
 */

import { getItem, setItem, removeItem } from './storage';

export type TimeEntry = {
  id: string;
  start: string; // ISO string
  end?: string; // ISO string
  durationMin?: number;
  notes?: string;
};

const TIME_ENTRIES_KEY = 'payroll_time_entries';
const CLOCKED_IN_KEY = 'payroll_clocked_in';

/**
 * Load time entries from localStorage
 */
export function loadTimeEntries(): TimeEntry[] {
  return getItem<TimeEntry[]>(TIME_ENTRIES_KEY, []);
}

/**
 * Save time entries to localStorage
 */
export function saveTimeEntries(entries: TimeEntry[]): boolean {
  return setItem(TIME_ENTRIES_KEY, entries);
}

/**
 * Add a new time entry
 */
export function addTimeEntry(entry: TimeEntry): TimeEntry[] {
  const entries = loadTimeEntries();
  const updated = [entry, ...entries];
  saveTimeEntries(updated);
  return updated;
}

/**
 * Update an existing time entry
 */
export function updateTimeEntry(id: string, updates: Partial<TimeEntry>): TimeEntry[] {
  const entries = loadTimeEntries();
  const index = entries.findIndex((e) => e.id === id);
  
  if (index !== -1) {
    entries[index] = { ...entries[index], ...updates };
    saveTimeEntries(entries);
  }
  
  return entries;
}

/**
 * Delete a time entry
 */
export function deleteTimeEntry(id: string): TimeEntry[] {
  const entries = loadTimeEntries();
  const filtered = entries.filter((e) => e.id !== id);
  saveTimeEntries(filtered);
  return filtered;
}

/**
 * Clear all time entries
 */
export function clearTimeEntries(): boolean {
  return removeItem(TIME_ENTRIES_KEY);
}

/**
 * Get clocked-in state
 */
export function getClockedInState(): boolean {
  return getItem<boolean>(CLOCKED_IN_KEY, false);
}

/**
 * Set clocked-in state
 */
export function setClockedInState(clockedIn: boolean): boolean {
  return setItem(CLOCKED_IN_KEY, clockedIn);
}

/**
 * Find the active (not clocked out) time entry
 */
export function getActiveTimeEntry(): TimeEntry | null {
  const entries = loadTimeEntries();
  return entries.find((e) => !e.end) || null;
}

/**
 * Get time entries for a specific date
 */
export function getTimeEntriesForDate(date: string): TimeEntry[] {
  const entries = loadTimeEntries();
  return entries.filter((e) => e.start.slice(0, 10) === date);
}

/**
 * Calculate total minutes for a specific date
 */
export function getTotalMinutesForDate(date: string): number {
  const entries = getTimeEntriesForDate(date);
  
  return entries.reduce((acc, e) => {
    if (e.durationMin != null) {
      return acc + e.durationMin;
    }
    
    const end = e.end ? new Date(e.end) : new Date();
    const start = new Date(e.start);
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    
    return acc + minutes;
  }, 0);
}
