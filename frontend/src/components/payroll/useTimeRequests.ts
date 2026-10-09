"use client";

import { useCallback, useEffect, useState } from "react";
import { listOvertimeRequests, type OvertimeRequest } from "@/lib/overtime-requests";
import { listAdjustmentRequests, type AdjustmentRequest } from "@/lib/adjustment-requests";

/**
 * Overtime and correction requests for one person. Employees always get their
 * own rows from the server; reviewers pass the userId whose time is shown.
 */
export function useTimeRequests(userId: string | undefined, enabled: boolean) {
  const [overtime, setOvertime] = useState<OvertimeRequest[]>([]);
  const [corrections, setCorrections] = useState<AdjustmentRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const query = userId ? { userId } : {};
      const [overtimeRows, correctionRows] = await Promise.all([
        listOvertimeRequests(query),
        listAdjustmentRequests(query),
      ]);
      setOvertime(overtimeRows);
      setCorrections(correctionRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { overtime, corrections, error, loading, reload };
}
