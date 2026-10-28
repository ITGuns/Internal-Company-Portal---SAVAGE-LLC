"use client";

import React from "react";
import { BadgeCheck, Clock } from "lucide-react";
import { approvalDisplayState, approvedByLine, LOCKED_WITHOUT_SIGN_OFF, type ApprovalFields } from "@/lib/payslip-approval";

interface PayslipApprovalBlockProps {
  payslip: ApprovalFields;
  /** Show "Waiting for disbursement approval" when the payslip is not approved. */
  showPending?: boolean;
  /** The payslip's period is processed (isPayrollPeriodLocked); nothing waits for a signature then. */
  periodLocked?: boolean;
  /** For an unsigned payslip of a locked period: a muted "Locked without sign-off" line instead of nothing. */
  showLockedNote?: boolean;
}

/**
 * Disbursement sign-off on a payslip (2026-10-28): the green approval block
 * with the signature, signer and date, or the waiting line. A revoked
 * approval keeps its "Approval revoked by ..." note. In a locked period an
 * unsigned payslip shows no waiting line (review fix 2026-10-28: payslips from
 * before the sign-off release would otherwise wait forever).
 */
export default function PayslipApprovalBlock({ payslip, showPending = true, periodLocked = false, showLockedNote = false }: PayslipApprovalBlockProps) {
  const state = approvalDisplayState(payslip, periodLocked);
  if (state === "locked-unsigned") {
    if (!showLockedNote) return null;
    return (
      <p className="text-xs text-[var(--muted)]">
        {LOCKED_WITHOUT_SIGN_OFF}
        {payslip.approvalNote ? `. ${payslip.approvalNote}` : ""}
      </p>
    );
  }
  if (state === "pending") {
    if (!showPending && !payslip.approvalNote) return null;
    return (
      <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
        <div className="min-w-0">
          {showPending && <p className="font-medium text-[var(--foreground)]">Waiting for disbursement approval</p>}
          {payslip.approvalNote && <p className="text-xs text-[var(--muted)]">{payslip.approvalNote}</p>}
        </div>
      </div>
    );
  }

  const signer = payslip.approvalSignerName?.trim() || "the signer";
  return (
    <section aria-label="Disbursement approval" className="rounded-[var(--radius-md)] border border-emerald-500/40 bg-emerald-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        Approved for disbursement
      </p>
      {payslip.approvalSignature && (
        // A data URL drawn on the sign-off canvas; white so the ink reads in both themes.
        <img
          src={payslip.approvalSignature}
          alt={`Signature of ${signer}`}
          className="mt-3 h-16 w-48 max-w-full rounded-[var(--radius-sm)] border border-emerald-500/20 bg-white object-contain"
        />
      )}
      <p className="mt-2 text-sm text-[var(--foreground)]">{approvedByLine(payslip)}</p>
      {payslip.approvalNote && <p className="mt-1 text-xs text-[var(--muted)]">Note: {payslip.approvalNote}</p>}
    </section>
  );
}
