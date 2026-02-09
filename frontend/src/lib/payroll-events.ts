/**
 * Custom payroll calendar events — persisted in localStorage
 */

const STORAGE_KEY = 'savage-payroll-events';

export type PayrollEventType = 'payday' | 'holiday' | 'deadline' | 'meeting' | 'other';

export type PayrollEvent = {
  id: string;
  title: string;
  date: string;          // YYYY-MM-DD
  type: PayrollEventType;
  description?: string;
};

export function loadPayrollEvents(): PayrollEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePayrollEvents(events: PayrollEvent[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function deletePayrollEvent(id: string): PayrollEvent[] {
  const events = loadPayrollEvents().filter(e => e.id !== id);
  savePayrollEvents(events);
  return events;
}
