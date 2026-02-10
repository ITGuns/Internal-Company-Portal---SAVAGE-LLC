/**
 * Payroll Events Library
 * Manages payroll calendar events via Backend API
 */

import { apiFetch } from './api';

const SECTION = 'payroll-events';

export type PayrollEventType = 'payday' | 'holiday' | 'deadline' | 'meeting' | 'other';

export type PayrollEvent = {
  id: string;
  title: string;
  date: string;          // YYYY-MM-DD
  type: PayrollEventType;
  description?: string;
  isBuiltIn?: boolean;
};

// Helper to map API data to Frontend interface
const mapApiEvent = (data: any): PayrollEvent => ({
  id: data.id,
  title: data.title,
  date: data.date.split('T')[0], // Backend returns ISO, frontend wants YYYY-MM-DD
  type: data.type as PayrollEventType,
  description: data.description,
  isBuiltIn: data.isBuiltIn
});

/**
 * Fetch all payroll events from API
 */
export async function fetchPayrollEvents(startDate?: string, endDate?: string): Promise<PayrollEvent[]> {
  try {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);

    const res = await apiFetch(`/payroll/events?${query.toString()}`);
    if (res.status === 200) {
      const data = await res.json();
      return data.map(mapApiEvent);
    }
  } catch (error) {
    console.error('Failed to fetch payroll events:', error);
  }
  return [];
}

/**
 * Create a new payroll event
 */
export async function createPayrollEvent(event: Omit<PayrollEvent, 'id'>): Promise<PayrollEvent | null> {
  try {
    const payload = {
      ...event,
      date: new Date(event.date).toISOString() // Send as ISO
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
    const payload: any = { ...updates };
    if (updates.date) payload.date = new Date(updates.date).toISOString();

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
    return res.status === 200;
  } catch (error) {
    console.error('Failed to delete payroll event:', error);
    return false;
  }
}

// Deprecated functions (kept for compatibility during migration, but should result in errors/no-ops if called synchronously expectation)
// We removed loadPayrollEvents and savePayrollEvents.

