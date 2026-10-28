/**
 * Custom hook for managing payroll data (time entries, events, clock state)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Must match the key used in TimeClock.tsx so both surfaces stay in sync
const ACTIVE_TIME_ENTRY_QUERY_KEY = ['time-entries', 'active'] as const;
import {
  fetchTimeEntriesOrThrow,
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
  const queryClient = useQueryClient();
  // True until the first load settles. Later reloads (backfill, filters, retry)
  // set `refreshing` instead, so the calendar stays mounted with its selected day.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [customEvents, setCustomEvents] = useState<PayrollEvent[]>([]);
  const settledOnceRef = useRef(false);
  // Only the latest request may write state (filters can change mid-flight).
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (settledOnceRef.current) setRefreshing(true);
    try {
      const [entries, events] = await Promise.all([
        fetchTimeEntriesOrThrow(startIso, endIso, targetUserId),
        fetchPayrollEvents(),
      ]);
      if (requestId !== requestIdRef.current) return;
      setTimeEntries(entries);
      setCustomEvents(events);
      setLoadError(null);

      // Update clocked in state and keep Header's TimeClock cache in sync
      const active = getActiveEntry(entries);
      setClockedIn(!!active);
      queryClient.setQueryData(ACTIVE_TIME_ENTRY_QUERY_KEY, active ?? null);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(error instanceof Error && error.message ? error.message : "Could not load payroll data.");
    } finally {
      if (requestId === requestIdRef.current) {
        settledOnceRef.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [endIso, queryClient, startIso, targetUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clockIn = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const entry = await clockInAPI();
      if (entry) {
        setTimeEntries((prev) => [entry, ...prev]);
        setClockedIn(true);
        // Keep Header's TimeClock widget in sync
        queryClient.setQueryData(ACTIVE_TIME_ENTRY_QUERY_KEY, entry);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      // The server may have changed state anyway (slow or duplicate request); resync this page and the header clock.
      void loadData();
      return { success: false, error: err instanceof Error ? err.message : undefined };
    }
  };

  const clockOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const entry = await clockOutAPI();
      if (entry) {
        setClockedIn(false);
        // Keep Header's TimeClock widget in sync
        queryClient.setQueryData(ACTIVE_TIME_ENTRY_QUERY_KEY, null);
        // Show the closed entry now; the reload brings the server's duration.
        setTimeEntries((prev) => prev.map((x) => (x.id === entry.id ? entry : x)));
        void loadData();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      // The server may have changed state anyway (slow or duplicate request); resync this page and the header clock.
      void loadData();
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
    refreshing,
    loadError,
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
