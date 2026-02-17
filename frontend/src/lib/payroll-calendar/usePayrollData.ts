/**
 * Custom hook for managing payroll data (time entries, events, clock state)
 */

import { useState, useEffect } from "react";
import {
  fetchTimeEntries,
  getActiveEntry,
  clockIn as clockInAPI,
  clockOut as clockOutAPI,
  createTimeEntry as createTimeEntryAPI,
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

export function usePayrollData() {
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [customEvents, setCustomEvents] = useState<PayrollEvent[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch both time entries and events from API/localStorage
      const [entries, events] = await Promise.all([
        fetchTimeEntries(),
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const clockIn = async () => {
    const entry = await clockInAPI();
    if (entry) {
      setTimeEntries((prev) => [entry, ...prev]);
      setClockedIn(true);
      return true;
    }
    return false;
  };

  const clockOut = async () => {
    const entry = await clockOutAPI();
    if (entry) {
      const updatedEntries = await fetchTimeEntries();
      setTimeEntries(updatedEntries);
      setClockedIn(false);
      return true;
    }
    return false;
  };

  const createTimeEntry = async (
    startIso: string,
    endIso?: string,
    notes?: string
  ) => {
    const entry = await createTimeEntryAPI(startIso, endIso, notes);
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
    deleteTimeEntry,
    addCustomEvent,
    updateCustomEvent,
    deleteCustomEvent,
    loadData,
  };
}
