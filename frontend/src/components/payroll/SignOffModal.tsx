"use client";

import React, { useEffect, useId, useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import SignaturePad from "./SignaturePad";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";
import { formatCurrency, formatPayPeriod } from "@/lib/payroll-calendar/payslip-utils";
import type { Payslip } from "@/lib/payroll-calendar/types";
import { payslipTaxTotal } from "@/lib/payroll-tax";
import {
  approveAllResultLine,
  approvedByLine,
  buildApprovalBody,
  plural,
  SIGNER_NAME_MAX_LENGTH,
  validateSignOff,
} from "@/lib/payslip-approval";
import {
  approveAllPayslips,
  approvePayslip,
  type ApproveAllResult,
  type PeriodApprovalSummary,
} from "@/lib/payslip-approval-api";
import type { ApiPayslip } from "@/lib/types/api";

export type SignOffTarget =
  | { kind: "single"; payslip: Payslip; employeeName: string }
  | { kind: "all"; periodId: string; periodLabel: string; summary: PeriodApprovalSummary };

export type SignOffResult =
  | { kind: "single"; payslip: ApiPayslip }
  | { kind: "all"; result: ApproveAllResult };

interface SignOffModalProps {
  target: SignOffTarget | null;
  /** The logged-in user's name; editable before signing. */
  defaultSignerName: string;
  onClose: () => void;
  /** After a successful sign-off, so the lists refetch. */
  onSigned: (result: SignOffResult) => void;
  /** After a refused sign-off (409 when the amounts changed), so the lists show the new amounts. */
  onFailed?: () => void;
  /** Single payslip: open its details once it is approved. */
  onViewPayslip?: (payslip: ApiPayslip) => void;
}


function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className={`text-right font-mono tabular-nums ${strong ? "text-base font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>{value}</dd>
    </div>
  );
}

/**
 * Disbursement sign-off (2026-10-28): signer name, a drawn or typed signature,
 * the amounts being approved and an "I have checked these amounts" box, then
 * Sign and approve. One payslip, or every unapproved payslip of the period.
 */
export default function SignOffModal({ target, defaultSignerName, onClose, onSigned, onFailed, onViewPayslip }: SignOffModalProps) {
  const id = useId();
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signature, setSignature] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  // Errors show after the first Sign and approve, then follow the fields as they are fixed.
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<SignOffResult | null>(null);

  // A fresh form each time the dialog opens.
  useEffect(() => {
    if (!target) return;
    setSignerName(defaultSignerName);
    setSignature(null);
    setConfirmed(false);
    setSubmitted(false);
    setServerError(null);
    setDone(null);
  }, [target, defaultSignerName]);

  if (!target) return null;

  const isAll = target.kind === "all";
  const nothingToApprove = isAll && target.summary.toApprove.count === 0;
  const check = validateSignOff({ signerName, signature, confirmed });
  const errors = submitted ? check.errors : {};

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (!check.valid || nothingToApprove) return;
    setBusy(true);
    setServerError(null);
    try {
      // The amounts on screen go along, so a payslip changed meanwhile is refused (409).
      const result: SignOffResult = target.kind === "single"
        ? {
          kind: "single",
          payslip: await approvePayslip(target.payslip.id, buildApprovalBody({ signerName, signature }, {
            expectedGrossPay: target.payslip.grossPay,
            expectedNetPay: target.payslip.netPay,
          })),
        }
        : {
          kind: "all",
          result: await approveAllPayslips(target.periodId, buildApprovalBody({ signerName, signature }, {
            expectedCount: target.summary.toApprove.count,
            expectedNet: target.summary.toApprove.net,
          })),
        };
      setDone(result);
      onSigned(result);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not approve. Try again.");
      onFailed?.();
    } finally {
      setBusy(false);
    }
  };

  const signedName = signerName.trim().replace(/\s+/g, " ");
  const approvedLine = done?.kind === "single"
    ? approvedByLine(done.payslip)
    : approvedByLine({ approvalSignerName: signedName, approvedAt: new Date().toISOString() });

  const footer = done ? (
    <>
      {done.kind === "single" && onViewPayslip && (
        <Button type="button" variant="outline" onClick={() => onViewPayslip(done.payslip)}>View payslip</Button>
      )}
      <Button type="button" variant="primary" onClick={onClose}>Done</Button>
    </>
  ) : (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button
        type="submit"
        form={`${id}-form`}
        variant="primary"
        loading={busy}
        disabled={nothingToApprove}
        icon={<PenLine className="h-4 w-4" aria-hidden="true" />}
      >
        Sign and approve
      </Button>
    </>
  );

  const taxTotal = target.kind === "single" ? payslipTaxTotal(target.payslip.items) : 0;

  return (
    <Modal
      isOpen
      onClose={busy ? () => undefined : onClose}
      title={isAll ? "Approve all for disbursement" : "Approve for disbursement"}
      subtitle={target.kind === "single"
        ? `${target.employeeName}, ${formatPayPeriod(target.payslip.payPeriodStart, target.payslip.payPeriodEnd)}`
        : `Every unapproved payslip of ${target.periodLabel}`}
      size="lg"
      closeOnBackdrop={false}
      bodyClassName="max-h-[calc(100dvh-13rem)]"
      footer={footer}
    >
      {done ? (
        <div role="status" className="flex items-start gap-3 rounded-[var(--radius-md)] border border-emerald-500/40 bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-semibold text-[var(--foreground)]">{approvedLine}</p>
            {done.kind === "all" && <p className="text-[var(--muted)]">{approveAllResultLine(done.result)}</p>}
            {done.kind === "single" && <p className="text-[var(--muted)]">The payslip is frozen until the approval is revoked.</p>}
          </div>
        </div>
      ) : (
        <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="grid gap-5">
          <section aria-label="Amounts to approve" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <dl className="grid gap-2 text-sm">
              {target.kind === "single" ? (
                <>
                  <Figure label="Gross pay" value={formatCurrency(target.payslip.grossPay)} />
                  {taxTotal > 0 && <Figure label="Withholding tax" value={`-${formatCurrency(taxTotal)}`} />}
                  <Figure label="Net pay to disburse" value={formatCurrency(target.payslip.netPay)} strong />
                </>
              ) : (
                <>
                  <Figure label="Payslips to approve" value={String(target.summary.toApprove.count)} />
                  <Figure label="Total gross" value={formatCurrency(target.summary.toApprove.gross)} />
                  <Figure label="Total net to disburse" value={formatCurrency(target.summary.toApprove.net)} strong />
                </>
              )}
            </dl>
            {isAll && target.summary.ownPending && (
              <p className="mt-3 text-xs text-[var(--muted)]">Your own payslip is left out. Another signer approves it.</p>
            )}
            {isAll && (target.summary.editedPending ?? 0) > 0 && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {plural(target.summary.editedPending, "payslip")} you edited {target.summary.editedPending === 1 ? "is" : "are"} left out. Another signer approves {target.summary.editedPending === 1 ? "it" : "them"}.
              </p>
            )}
            {isAll && target.summary.approved > 0 && (
              <p className="mt-1 text-xs text-[var(--muted)]">{plural(target.summary.approved, "payslip")} already approved stay as they are.</p>
            )}
            {nothingToApprove && <p className="mt-3 text-sm text-[var(--foreground)]">Nothing in this period waits for your approval.</p>}
          </section>

          <div>
            <label htmlFor={`${id}-signer`} className={fieldLabelClass}>
              Signer name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id={`${id}-signer`}
              type="text"
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              maxLength={SIGNER_NAME_MAX_LENGTH}
              autoComplete="name"
              className={fieldInputClass}
              aria-invalid={Boolean(errors.signerName)}
              aria-describedby={errors.signerName ? `${id}-signer-error` : `${id}-signer-help`}
              disabled={busy}
              required
            />
            {errors.signerName
              ? <p id={`${id}-signer-error`} className={fieldErrorClass}>{errors.signerName}</p>
              : <p id={`${id}-signer-help`} className={fieldHelpClass}>Printed under the signature on the payslip.</p>}
          </div>

          <div>
            <p className={fieldLabelClass} id={`${id}-signature-label`}>
              Signature <span className="text-red-500" aria-hidden="true">*</span>
            </p>
            <SignaturePad
              typedName={signerName}
              onChange={setSignature}
              disabled={busy}
              invalid={Boolean(errors.signature)}
              describedBy={errors.signature ? `${id}-signature-error` : undefined}
            />
            {errors.signature && <p id={`${id}-signature-error`} className={fieldErrorClass}>{errors.signature}</p>}
          </div>

          <div>
            <label className="flex min-h-10 items-start gap-2 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                aria-invalid={Boolean(errors.confirmed)}
                aria-describedby={errors.confirmed ? `${id}-confirm-error` : undefined}
                disabled={busy}
              />
              I have checked these amounts
            </label>
            {errors.confirmed && <p id={`${id}-confirm-error`} className={fieldErrorClass}>{errors.confirmed}</p>}
          </div>

          {serverError && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 p-3 text-sm text-[var(--foreground)]">
              {serverError}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}
