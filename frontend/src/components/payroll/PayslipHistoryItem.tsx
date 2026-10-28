"use client";

import React from "react";
import { BadgeCheck, FileText, LockKeyhole, PenLine, Signature } from "lucide-react";
import { formatPayrollDate } from "@/lib/payroll-dates";
import { isPayrollPeriodLocked } from "@/lib/payslip-edit";
import { approveButtonState, isPayslipApproved } from "@/lib/payslip-approval";
import type { Payslip } from "@/lib/payroll-calendar/types";

interface PayslipHistoryItemProps {
  payslip: Payslip;
  onView: (payslip: Payslip) => void;
  onEdit?: (payslip: Payslip) => void;
  /** Opens the sign-off dialog; the button shows for every payroll role. */
  onApprove?: (payslip: Payslip) => void;
  canSign: boolean;
  /** The payslip belongs to the person looking at it. */
  isOwn: boolean;
}

/** One row of Payslip History in Payslips Management: period, net, sign-off state and actions. */
export default function PayslipHistoryItem({ payslip, onView, onEdit, onApprove, canSign, isOwn }: PayslipHistoryItemProps) {
  const periodStart = formatPayrollDate(payslip.payPeriodStart, { format: { month: "short", day: "numeric" } });
  const periodEnd = formatPayrollDate(payslip.payPeriodEnd, { format: { month: "short", day: "numeric" } });
  const locked = isPayrollPeriodLocked(payslip.periodStatus);
  const approved = isPayslipApproved(payslip);
  const approve = approveButtonState({ canSign, locked, isOwn });
  const hintId = `payslip-${payslip.id}-approve-hint`;

  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--border)] group hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-[var(--border)] flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-105 transition-transform">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[var(--foreground)] truncate">
            {periodStart} to {periodEnd}
          </div>
          {payslip.editedAt && (
            <div className="text-[10px] text-amber-700 dark:text-amber-300 truncate" title={payslip.editNote ?? undefined}>
              Edited by hand{payslip.editNote ? `: ${payslip.editNote}` : ""}
            </div>
          )}
          <div className="text-[10px] text-[var(--muted)] font-medium flex items-center gap-2 mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">₱{payslip.netPay.toLocaleString()}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
            {approved ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Approved
              </span>
            ) : (
              <span className="font-semibold text-amber-700 dark:text-amber-300">{locked ? payslip.status : "Awaiting approval"}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onView(payslip)}
          className="p-1 px-3 text-[10px] font-bold bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-200 hover:bg-blue-700 shadow-md transform translate-x-2 group-hover:translate-x-0 focus-visible:translate-x-0"
        >
          VIEW
        </button>
      </div>
      {locked ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <LockKeyhole className="h-3 w-3 shrink-0" aria-hidden="true" />
          Period locked. Payslip is read-only.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {onApprove && !approved && (
            <button
              type="button"
              onClick={() => onApprove(payslip)}
              disabled={!approve.enabled}
              aria-describedby={approve.hint ? hintId : undefined}
              className="inline-flex min-h-8 items-center gap-1.5 rounded px-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-emerald-300"
            >
              <Signature className="h-3.5 w-3.5" aria-hidden="true" />
              Approve for disbursement
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(payslip)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded px-2 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] dark:text-sky-300"
              aria-label={`Edit payslip ${periodStart} to ${periodEnd}`}
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
              Edit or delete
            </button>
          )}
          {onApprove && !approved && approve.hint && (
            <p id={hintId} className="w-full px-2 text-[11px] text-[var(--muted)]">{approve.hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
