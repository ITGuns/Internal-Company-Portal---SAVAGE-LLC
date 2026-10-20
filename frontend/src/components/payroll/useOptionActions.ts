"use client";

import { useCallback, useState } from "react";
import { useRefreshPayrollLists } from "./usePayrollOptions";

function withoutKey(record: Record<string, string>, key: string): Record<string, string> {
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * Runs one list change at a time for Payroll options: tracks which row is
 * busy, keeps the server's message per row, and refetches the lists after a
 * change so every open page shows the new names.
 */
export function useOptionActions() {
  const refresh = useRefreshPayrollLists();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = useCallback(async (rowId: string, action: () => Promise<unknown>): Promise<boolean> => {
    setPendingId(rowId);
    setErrors((current) => withoutKey(current, rowId));
    try {
      await action();
      await refresh();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "That did not work. Try again.";
      setErrors((current) => ({ ...current, [rowId]: message }));
      return false;
    } finally {
      setPendingId(null);
    }
  }, [refresh]);

  const clearError = useCallback((rowId: string) => setErrors((current) => withoutKey(current, rowId)), []);

  return { pendingId, errors, run, clearError };
}
