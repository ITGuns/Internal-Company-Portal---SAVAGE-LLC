/**
 * Payroll Events Library
 * Manages payroll calendar events via Backend API with localStorage fallback
 */

import { apiFetch } from './api';

const SECTION = 'payroll-events';
const STORAGE_KEY = 'savage-payroll-events';

export type PayrollEventType = 'payday' | 'holiday' | 'deadline' | 'meeting' | 'other';

export type PayrollEvent = {
  id: string;
  title: string;
  date: string;          // YYYY-MM-DD
  type: PayrollEventType;
  description?: string;
  isBuiltIn?: boolean;
};

// localStorage fallback functions
function getStoredEvents(): PayrollEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveStoredEvents(events: PayrollEvent[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to save events to localStorage:', e);
    }
  }
}

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
 * Fetch all payroll events from API with localStorage fallback
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
    console.warn('API not available, falling back to localStorage for payroll events');
  }
  
  // Fallback to localStorage
  return getStoredEvents();
}

/**
 * Create a new payroll event with localStorage fallback
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
    console.warn('API not available, falling back to localStorage for payroll events');
    
    // Fallback to localStorage
    const events = getStoredEvents();
    const newEvent: PayrollEvent = {
      ...event,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    const updatedEvents = [...events, newEvent];
    saveStoredEvents(updatedEvents);
    return newEvent;
  }
  return null;
}

/**
 * Update a payroll event with localStorage fallback
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
    console.warn('API not available, falling back to localStorage for payroll events');
    
    // Fallback to localStorage
    const events = getStoredEvents();
    const eventIndex = events.findIndex(e => e.id === id);
    if (eventIndex !== -1) {
      const updatedEvent = { ...events[eventIndex], ...updates };
      events[eventIndex] = updatedEvent;
      saveStoredEvents(events);
      return updatedEvent;
    }
  }
  return null;
}

/**
 * Delete a payroll event with localStorage fallback
 */
export async function deletePayrollEvent(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/payroll/events/${id}`, {
      method: 'DELETE'
    });
    return res.status === 200;
  } catch (error) {
    console.warn('API not available, falling back to localStorage for payroll events');
    
    // Fallback to localStorage
    const events = getStoredEvents();
    const filteredEvents = events.filter(e => e.id !== id);
    if (filteredEvents.length !== events.length) {
      saveStoredEvents(filteredEvents);
      return true;
    }
    return false;
  }
}

// Deprecated functions (kept for compatibility during migration, but should result in errors/no-ops if called synchronously expectation)
// We removed loadPayrollEvents and savePayrollEvents.

