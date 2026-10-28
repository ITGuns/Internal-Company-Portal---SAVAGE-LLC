"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApprovalSummary, lockPayrollPeriod, type PeriodApprovalSummary } from "@/lib/payslip-approval-api";
import { lockConfirmMessage, parseUnapprovedCount } from "@/lib/payslip-approval";

/**
 * Disbursement sign-off counts for the active period (GET
 * /payroll/periods/:id/approval-summary). Null while loading, without a
 * period, or when the summary cannot be read (the lock route still checks).
 */
export function usePeriodApproval(periodId: string | null | undefined, enabled: boolean) {
  const [summary, setSummary] = useState<PeriodApprovalSummary | null>(null);

  const reload = useCallback(async () => {
    if (!periodId || !enabled) {
      setSummary(null);
      return;
    }
    try {
      setSummary(await fetchApprovalSummary(periodId));
    } catch {
      setSummary(null);
    }
  }, [periodId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, reload };
}

/**
 * Lock & Finalize. A signer (Disbursement Officer or full access, `canForce`)
 * gets one confirmation that names the unapproved payslips and may lock
 * anyway; when the count changed meanwhile, the server's 409 brings a second
 * prompt with its count. Anyone else confirms the plain lock and, while
 * payslips are unapproved, gets the server's 409 message ("... A Disbursement
 * Officer or an admin can lock anyway.") as the thrown error, never a force
 * prompt (review fix 2026-10-28). Resolves true when the period was locked.
 */
export async function confirmAndLockPeriod(
  periodId: string,
  periodLabel: string,
  unapproved: number,
  canForce: boolean,
  confirm: (message: string) => boolean = (message) => window.confirm(message),
): Promise<boolean> {
  if (!confirm(lockConfirmMessage(periodLabel, canForce ? unapproved : 0))) return false;
  try {
    await lockPayrollPeriod(periodId, canForce && unapproved > 0);
    return true;
  } catch (error) {
    const count = canForce ? parseUnapprovedCount(error instanceof Error ? error.message : "") : null;
    if (count === null) throw error;
    if (!confirm(lockConfirmMessage(periodLabel, count))) return false;
    await lockPayrollPeriod(periodId, true);
    return true;
  }
}
