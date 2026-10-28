"use client";

import React, { useId, useState } from "react";
import Button from "@/components/Button";
import { inUseLabel } from "@/lib/payroll-options";
import {
  computeTaxAmount,
  EMPTY_TAX_RULE_DRAFT,
  formatTaxRate,
  toTaxRulePayload,
  validateTaxRuleDraft,
  type TaxRuleDraft,
} from "@/lib/payroll-tax";
import { formatPayAmount } from "@/lib/payroll-setup";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

interface TaxRuleOptionFormProps {
  initial?: TaxRuleDraft;
  /** Employees who chose this rule (edit only); changes reach their next payslips. */
  inUseCount?: number;
  busy: boolean;
  serverError?: string;
  submitLabel: string;
  onSubmit: (payload: ReturnType<typeof toTaxRulePayload>) => void;
  onCancel: () => void;
}

const EXAMPLE_GROSS = 20000;

/** Inline add / edit form for a withholding tax rule. Messages match the server's. */
export default function TaxRuleOptionForm({ initial, inUseCount, busy, serverError, submitLabel, onSubmit, onCancel }: TaxRuleOptionFormProps) {
  const id = useId();
  const [draft, setDraft] = useState<TaxRuleDraft>(initial ?? EMPTY_TAX_RULE_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const { valid, errors } = validateTaxRuleDraft(draft);
  const shown = submitted ? errors : {};
  const rate = valid ? toTaxRulePayload(draft).rate : null;

  const update = (field: keyof TaxRuleDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (valid) onSubmit(toTaxRulePayload(draft));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-[var(--radius-md)] border border-[var(--accent)]/40 bg-[var(--card-surface)] p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div>
          <label htmlFor={`${id}-name`} className={fieldLabelClass}>Name</label>
          <input
            id={`${id}-name`}
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            className={fieldInputClass}
            placeholder="e.g. Withholding 5%"
            maxLength={60}
            aria-invalid={Boolean(shown.name)}
            aria-describedby={shown.name ? `${id}-name-error` : undefined}
            disabled={busy}
          />
          {shown.name && <p id={`${id}-name-error`} className={fieldErrorClass}>{shown.name}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-rate`} className={fieldLabelClass}>Rate (% of gross)</label>
          <input
            id={`${id}-rate`}
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="any"
            value={draft.rate}
            onChange={(event) => update("rate", event.target.value)}
            className={`${fieldInputClass} font-mono tabular-nums`}
            placeholder="5"
            aria-invalid={Boolean(shown.rate)}
            aria-describedby={shown.rate ? `${id}-rate-error` : `${id}-rate-help`}
            disabled={busy}
          />
          {shown.rate
            ? <p id={`${id}-rate-error`} className={fieldErrorClass}>{shown.rate}</p>
            : <p id={`${id}-rate-help`} className={fieldHelpClass}>0 to 100.</p>}
        </div>
      </div>

      {rate !== null && (
        <p className="text-xs text-[var(--muted)]">
          On a gross of {formatPayAmount(EXAMPLE_GROSS, "PHP")} this withholds {formatPayAmount(computeTaxAmount(EXAMPLE_GROSS, rate), "PHP")} ({formatTaxRate(rate)}%).
        </p>
      )}
      {Boolean(inUseCount) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {inUseLabel(inUseCount)}. Changes apply to payslips generated from now on; issued payslips stay as they are.
        </p>
      )}
      {serverError && <p role="alert" className={fieldErrorClass}>{serverError}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" size="sm" variant="primary" loading={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}
