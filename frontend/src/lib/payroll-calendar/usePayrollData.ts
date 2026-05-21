/**
 * Custom hook for managing payroll data (time entries, events, clock state)
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchTimeEntries,
  getActiveEntry,
  clockIn as clockInAPI,
  clockOut as clockOutAPI,
  createTimeEntry as createTimeEntryAPI,
  updateTimeEntry as updateTimeEntryAPI,
  deleteTimeEntry as deleteTimeEntryAPI,
  type TimeEntry,
} from "../time-entries";
import {
  fetchPayrollEvents,
  createPayrollEvent as createEvent,
  updatePayrollEvent as updateEvent,
  deletePayrollEvent as deleteEvent,
  type PayrollEvent
} from "../payroll-events";

export function usePayrollData(targetUserId?: string, startIso?: string, endIso?: string) {
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [customEvents, setCustomEvents] = useState<PayrollEvent[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both time entries and events from API/localStorage
      const [entries, events] = await Promise.all([
        fetchTimeEntries(startIso, endIso, targetUserId),
        fetchPayrollEvents(),
      ]);
      setTimeEntries(entries);
      setCustomEvents(events);

      // Update clocked in state
      const active = getActiveEntry(entries);
      setClockedIn(!!active);
    } catch (error) {
      console.error("Failed to load payroll data:", error);
    } finally {
      setLoading(false);
    }
  }, [endIso, startIso, targetUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clockIn = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const entry = await clockInAPI();
      if (entry) {
        setTimeEntries((prev) => [entry, ...prev]);
        setClockedIn(true);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : undefined };
    }
  };

  const clockOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const entry = await clockOutAPI();
      if (entry) {
        const updatedEntries = await fetchTimeEntries(startIso, endIso, targetUserId);
        setTimeEntries(updatedEntries);
        setClockedIn(false);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : undefined };
    }
  };

  const createTimeEntry = async (
    startIso: string,
    endIso?: string,
    notes?: string,
    userId?: string
  ) => {
    const entry = await createTimeEntryAPI(startIso, endIso, notes, userId || targetUserId);
    if (entry) {
      setTimeEntries((prev) => [entry, ...prev]);
      return true;
    }
    return false;
  };

  const deleteTimeEntry = async (id: string) => {
    const success = await deleteTimeEntryAPI(id);
    if (success) {
      setTimeEntries((prev) => prev.filter((x) => x.id !== id));
      return true;
    }
    return false;
  };

  const updateTimeEntry = async (
    id: string,
    startIso: string,
    endIso?: string,
    notes?: string,
    userId?: string
  ) => {
    const entry = await updateTimeEntryAPI(id, startIso, endIso, notes, userId || targetUserId);
    if (entry) {
      setTimeEntries((prev) => prev.map((x) => (x.id === id ? entry : x)));
      return true;
    }
    return false;
  };

  const addCustomEvent = async (event: Omit<PayrollEvent, "id">) => {
    const newEvent = await createEvent(event);
    if (newEvent) {
      setCustomEvents((prev) => [...prev, newEvent]);
      return newEvent;
    }
    return null;
  };

  const updateCustomEvent = async (id: string, updates: Partial<PayrollEvent>) => {
    const updated = await updateEvent(id, updates);
    if (updated) {
      setCustomEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return true;
    }
    return false;
  };

  const deleteCustomEvent = async (id: string) => {
    const success = await deleteEvent(id);
    if (success) {
      setCustomEvents((prev) => prev.filter((e) => e.id !== id));
    }
    return success;
  };

  return {
    loading,
    clockedIn,
    timeEntries,
    customEvents,
    clockIn,
    clockOut,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    addCustomEvent,
    updateCustomEvent,
    deleteCustomEvent,
    loadData,
  };
}
