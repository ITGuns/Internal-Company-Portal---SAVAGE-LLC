"use client";

import React from "react";
import { Loader2, LockKeyhole, Signature, Sparkles, Zap } from "lucide-react";
import Button from "@/components/Button";
import { formatPayrollDate } from "@/lib/payroll-dates";
import { approvalProgressLabel, SIGNER_ONLY_HINT } from "@/lib/payslip-approval";
import type { PeriodApprovalSummary } from "@/lib/payslip-approval-api";

export interface ActivePeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface ActivePeriodPanelProps {
  period: ActivePeriod | null;
  summary: PeriodApprovalSummary | null;
  canSign: boolean;
  isBulkGenerating: boolean;
  isLocking: boolean;
  onBulkGenerate: () => void;
  onLock: () => void;
  onApproveAll: () => void;
}

/**
 * Top of the Payslips Management sidebar: the active period, how many of its
 * payslips are approved for disbursement, Run Automated Payroll, Approve all
 * (signers) and Lock & Finalize. Moved out of PayslipsTab on 2026-10-28.
 */
export default function ActivePeriodPanel({
  period,
  summary,
  canSign,
  isBulkGenerating,
  isLocking,
  onBulkGenerate,
  onLock,
  onApproveAll,
}: ActivePeriodPanelProps) {
  const isProcessed = period?.status === "processed";
  const isDraft = period?.status === "draft";
  const progress = approvalProgressLabel(summary);
  const canApproveAll = canSign && isDraft && Boolean(summary && summary.toApprove.count > 0);
  const approveAllHint = !canSign ? SIGNER_ONLY_HINT : summary && summary.toApprove.count === 0 && summary.total > 0 ? "Every payslip you can sign is approved." : undefined;

  return (
    <div className="p-4 border-b border-[var(--border)] bg-gray-50/50 dark:bg-black/20">
      {period && (
        <div className="mb-3 px-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Active Payroll Period</div>
          <div className="text-xs font-semibold text-[var(--foreground)] mt-0.5">
            {formatPayrollDate(period.startDate, { edge: "start", format: { month: "short", day: "numeric" } })} to {formatPayrollDate(period.endDate, { edge: "end" })}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
              isProcessed
                ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20"
            }`}>
              {period.status}
            </span>
            {progress && (
              <span className="text-[11px] font-medium text-[var(--muted)]" aria-label={`Disbursement sign-off: ${progress}`}>
                {progress}
              </span>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onBulkGenerate}
        disabled={isBulkGenerating || isProcessed}
        className={`w-full group relative overflow-hidden flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-extrabold transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 active:scale-[0.98] ${(isBulkGenerating || isProcessed) ? "opacity-70 cursor-not-allowed" : ""}`}
        title={isProcessed ? "Cannot run payroll for a processed cycle" : "Calculates payroll based on work hours/timers for all Deployed employees"}
      >
        {/* Shine effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
        {isBulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
        <span className="relative z-10">{isBulkGenerating ? "Calculating Payroll..." : "Run Automated Payroll"}</span>
        {!isBulkGenerating && <Sparkles className="w-3 h-3 text-amber-300 animate-pulse relative z-10" />}
      </button>

      {isDraft && (
        <>
          <Button
            variant="outline"
            onClick={onApproveAll}
            disabled={!canApproveAll}
            aria-describedby={approveAllHint ? "approve-all-hint" : undefined}
            className="w-full mt-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300 text-[11px] font-extrabold h-10 flex items-center justify-center gap-2"
            icon={<Signature className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Approve all for disbursement
          </Button>
          {approveAllHint && <p id="approve-all-hint" className="mt-1 px-1 text-[11px] text-[var(--muted)]">{approveAllHint}</p>}
          <Button
            variant="outline"
            onClick={onLock}
            disabled={isLocking}
            className="w-full mt-2 border-[var(--border)] hover:bg-[var(--card-surface)] text-[11px] font-extrabold h-10 flex items-center justify-center gap-2"
            icon={<LockKeyhole className="w-3.5 h-3.5" />}
          >
            {isLocking ? "Locking Period..." : "Lock & Finalize Period"}
          </Button>
        </>
      )}
    </div>
  );
}
