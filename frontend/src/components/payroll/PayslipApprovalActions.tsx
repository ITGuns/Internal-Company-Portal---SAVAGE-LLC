"use client";

import React, { useState } from "react";
import { Signature, Undo2 } from "lucide-react";
import Button from "@/components/Button";
import type { Payslip } from "@/lib/payroll-calendar/types";
import { isPayrollPeriodLocked } from "@/lib/payslip-edit";
import { approveButtonState, isPayslipApproved } from "@/lib/payslip-approval";

interface PayslipApprovalActionsProps {
  payslip: Payslip;
  canSign: boolean;
  isOwn: boolean;
  onApprove?: (payslip: Payslip) => void;
  onRevoke?: (payslip: Payslip) => Promise<void>;
}

/**
 * Approve and revoke in the payslip details (2026-10-28). Approve shows for
 * every payroll role and is enabled for signers only, with the reason
 * underneath. Revoke asks first and shows the server's answer inline.
 */
export default function PayslipApprovalActions({ payslip, canSign, isOwn, onApprove, onRevoke }: PayslipApprovalActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = isPayrollPeriodLocked(payslip.periodStatus);
  const approved = isPayslipApproved(payslip);
  const approve = approveButtonState({ canSign, locked, isOwn });
  const hintId = `payslip-details-${payslip.id}-approve-hint`;

  if (locked) return null;

  if (!approved) {
    if (!onApprove) return null;
    return (
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        {approve.hint && <p id={hintId} className="text-xs text-[var(--muted)]">{approve.hint}</p>}
        <Button
          type="button"
          variant="success"
          icon={<Signature className="h-4 w-4" aria-hidden="true" />}
          onClick={() => onApprove(payslip)}
          disabled={!approve.enabled}
          aria-describedby={approve.hint ? hintId : undefined}
          className="sm:ml-auto"
        >
          Approve for disbursement
        </Button>
      </div>
    );
  }

  if (!onRevoke || !canSign || isOwn) return null;

  const handleRevoke = async () => {
    setRevoking(true);
    setError(null);
    try {
      await onRevoke(payslip);
      setConfirming(false);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Could not revoke the approval.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-2">
      {confirming ? (
        <div role="group" aria-label="Revoke the approval" className="rounded-[var(--radius-md)] border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">Revoke the approval?</p>
          <p className="mt-1 text-[var(--muted)]">The payslip can then be edited or regenerated, and it needs a new sign-off before it is paid.</p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={revoking}>Keep the approval</Button>
            <Button type="button" variant="danger" onClick={() => void handleRevoke()} loading={revoking}>Revoke approval</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" icon={<Undo2 className="h-4 w-4" aria-hidden="true" />} onClick={() => setConfirming(true)}>
            Revoke approval
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
