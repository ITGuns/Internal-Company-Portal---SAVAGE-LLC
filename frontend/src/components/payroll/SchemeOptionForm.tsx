"use client";

import React, { useId, useState } from "react";
import Button from "@/components/Button";
import {
  EMPTY_SCHEME_DRAFT,
  SCHEME_KIND_OPTIONS,
  describeScheme,
  inUseLabel,
  toSchemePayload,
  validateSchemeDraft,
  type SchemeDraft,
} from "@/lib/payroll-options";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

interface SchemeOptionFormProps {
  initial?: SchemeDraft;
  /** Employees on this scheme (edit only); changes reach their next payslips. */
  inUseCount?: number;
  busy: boolean;
  serverError?: string;
  submitLabel: string;
  onSubmit: (payload: ReturnType<typeof toSchemePayload>) => void;
  onCancel: () => void;
}

/** Inline add / edit form for a salary divisor scheme. Messages match the server's. */
export default function SchemeOptionForm({ initial, inUseCount, busy, serverError, submitLabel, onSubmit, onCancel }: SchemeOptionFormProps) {
  const id = useId();
  const [draft, setDraft] = useState<SchemeDraft>(initial ?? EMPTY_SCHEME_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const { valid, errors } = validateSchemeDraft(draft);
  const shown = submitted ? errors : {};
  const unit = SCHEME_KIND_OPTIONS.find((option) => option.value === draft.kind)?.unit;
  const preview = valid ? describeScheme(toSchemePayload(draft)) : null;

  const update = (field: keyof SchemeDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (valid) onSubmit(toSchemePayload(draft));
  };
  const describedBy = (field: keyof SchemeDraft, hasHelp = false) =>
    shown[field] ? `${id}-${field}-error` : hasHelp ? `${id}-${field}-help` : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-[var(--radius-md)] border border-[var(--accent)]/40 bg-[var(--card-surface)] p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-name`} className={fieldLabelClass}>Name</label>
          <input
            id={`${id}-name`}
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            className={fieldInputClass}
            placeholder="e.g. Flat 24 days"
            maxLength={60}
            aria-invalid={Boolean(shown.name)}
            aria-describedby={describedBy("name")}
            disabled={busy}
          />
          {shown.name && <p id={`${id}-name-error`} className={fieldErrorClass}>{shown.name}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-kind`} className={fieldLabelClass}>Divide the monthly salary by</label>
          <select
            id={`${id}-kind`}
            value={draft.kind}
            onChange={(event) => update("kind", event.target.value)}
            className={fieldInputClass}
            aria-invalid={Boolean(shown.kind)}
            aria-describedby={describedBy("kind")}
            disabled={busy}
          >
            {SCHEME_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {shown.kind && <p id={`${id}-kind-error`} className={fieldErrorClass}>{shown.kind}</p>}
        </div>
        {draft.kind !== "weekdays" && (
          <div>
            <label htmlFor={`${id}-value`} className={fieldLabelClass}>Number of {unit || "days"}</label>
            <input
              id={`${id}-value`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={draft.value}
              onChange={(event) => update("value", event.target.value)}
              className={`${fieldInputClass} font-mono tabular-nums`}
              aria-invalid={Boolean(shown.value)}
              aria-describedby={describedBy("value")}
              disabled={busy}
            />
            {shown.value && <p id={`${id}-value-error`} className={fieldErrorClass}>{shown.value}</p>}
          </div>
        )}
        <div>
          <label htmlFor={`${id}-cap`} className={fieldLabelClass}>Most credited days a month</label>
          <input
            id={`${id}-cap`}
            type="number"
            inputMode="decimal"
            min="1"
            max="31"
            step="any"
            value={draft.maxCreditedDays}
            onChange={(event) => update("maxCreditedDays", event.target.value)}
            className={`${fieldInputClass} font-mono tabular-nums`}
            placeholder="No cap"
            aria-invalid={Boolean(shown.maxCreditedDays)}
            aria-describedby={describedBy("maxCreditedDays", true)}
            disabled={busy}
          />
          {shown.maxCreditedDays
            ? <p id={`${id}-maxCreditedDays-error`} className={fieldErrorClass}>{shown.maxCreditedDays}</p>
            : <p id={`${id}-maxCreditedDays-help`} className={fieldHelpClass}>Leave empty for no cap. Regular hours above the cap show as not paid.</p>}
        </div>
      </div>

      {preview && <p className="text-xs text-[var(--muted)]">{preview}.</p>}
      {Boolean(inUseCount) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {inUseLabel(inUseCount)}. Changes apply to their payslips generated from now on; issued payslips stay as they are.
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
