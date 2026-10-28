/**
 * Payroll Events Library
 * Manages payroll calendar events via Backend API
 */

import { apiFetch } from './api';
import { manilaDayKey, manilaInstant } from './payroll-dates';
import type { ApiPayrollEvent } from './types/api';

export type PayrollEventType = 'payday' | 'holiday' | 'deadline' | 'meeting' | 'other';

export type PayrollEvent = {
  id: string;
  title: string;
  date: string;          // YYYY-MM-DD
  type: PayrollEventType;
  description?: string;
  isBuiltIn?: boolean;
};

/**
 * Event dates are Manila days. The API stores an instant: rows saved before
 * 2026-10-28 hold UTC midnight, newer ones Manila noon (04:00 UTC). Both read
 * as the same Manila day, and so does a plain UTC date split of the new rows.
 */
export function eventDayFromApi(value: string): string {
  return manilaDayKey(value) ?? value.slice(0, 10);
}

/** The instant stored for an event day: noon in Manila. */
export function eventDateForApi(dayKey: string): string {
  return manilaInstant(dayKey, '12:00') ?? dayKey;
}

// Helper to map API data to Frontend interface
const mapApiEvent = (data: ApiPayrollEvent): PayrollEvent => ({
  id: data.id,
  title: data.title,
  date: eventDayFromApi(data.date),
  type: data.type as PayrollEventType,
  description: data.description,
  isBuiltIn: data.isBuiltIn
});

/**
 * Fetch all payroll events from API. Throws when the server fails, so the
 * calendar can show the error with a retry instead of an empty list.
 */
export async function fetchPayrollEvents(startDate?: string, endDate?: string): Promise<PayrollEvent[]> {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);

  // apiFetch throws with the server's message on any non-2xx response.
  const res = await apiFetch(`/payroll/events?${query.toString()}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('Could not load payroll events (unexpected response)');
  return (data as ApiPayrollEvent[]).map(mapApiEvent);
}

/**
 * Create a new payroll event
 */
export async function createPayrollEvent(event: Omit<PayrollEvent, 'id'>): Promise<PayrollEvent | null> {
  try {
    const payload = {
      ...event,
      date: eventDateForApi(event.date),
    };

    const res = await apiFetch('/payroll/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.status === 201) {
      const data = await res.json();
      return mapApiEvent(data);
    }
  } catch (error) {
    console.error('Failed to create payroll event:', error);
  }
  return null;
}

/**
 * Update a payroll event
 */
export async function updatePayrollEvent(id: string, updates: Partial<Omit<PayrollEvent, 'id'>>): Promise<PayrollEvent | null> {
  try {
    const payload: Partial<Omit<PayrollEvent, 'id'>> & { date?: string } = { ...updates };
    if (updates.date) payload.date = eventDateForApi(updates.date);

    const res = await apiFetch(`/payroll/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    if (res.status === 200) {
      const data = await res.json();
      return mapApiEvent(data);
    }
  } catch (error) {
    console.error('Failed to update payroll event:', error);
  }
  return null;
}

/**
 * Delete a payroll event
 */
export async function deletePayrollEvent(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/payroll/events/${id}`, {
      method: 'DELETE'
    });
    return res.status === 200 || res.status === 204;
  } catch (error) {
    console.error('Failed to delete payroll event:', error);
  }
  return false;
}
