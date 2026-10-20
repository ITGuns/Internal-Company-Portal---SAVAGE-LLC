"use client";

import React, { useId, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import {
  PAYROLL_OPTION_CATEGORY_LABELS,
  validateOptionDraft,
  type PayrollOptionCategory,
  type PayrollOptionRow,
} from "@/lib/payroll-options";
import { createPayrollOption, deletePayrollOption, updatePayrollOption } from "@/lib/payroll-options-api";
import OptionListRow from "./OptionListRow";
import { useOptionActions } from "./useOptionActions";
import { usePayrollOptionList } from "./usePayrollOptions";
import { fieldErrorClass, fieldInputClass, fieldLabelClass } from "./form-styles";

const NEW_ROW = "new-option";

interface LabelOptionsSectionProps {
  category: PayrollOptionCategory;
  title: string;
  description: string;
  emptyText: string;
}

function LabelForm({ initialLabel, busy, serverError, submitLabel, noun, onSubmit, onCancel }: {
  initialLabel: string;
  busy: boolean;
  serverError?: string;
  submitLabel: string;
  noun: string;
  onSubmit: (label: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [label, setLabel] = useState(initialLabel);
  const [submitted, setSubmitted] = useState(false);
  const { valid, errors } = validateOptionDraft({ label });
  const error = submitted ? errors.label : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--accent)]/40 bg-[var(--card-surface)] p-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (valid) onSubmit(label.trim().replace(/\s+/g, " "));
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={`${id}-label`} className={fieldLabelClass}>Name of the {noun}</label>
        <input
          id={`${id}-label`}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className={fieldInputClass}
          maxLength={60}
          aria-invalid={Boolean(error)}
          aria-describedby={error || serverError ? `${id}-error` : undefined}
          disabled={busy}
        />
        {(error || serverError) && <p id={`${id}-error`} role="alert" className={fieldErrorClass}>{error ?? serverError}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" size="sm" variant="primary" loading={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function orderRows(rows: readonly PayrollOptionRow[]): PayrollOptionRow[] {
  return [...rows].sort((left, right) => Number(left.archived) - Number(right.archived) || left.sortOrder - right.sortOrder);
}

/** "Employment types" and "Pay frequency labels" sections of Payroll options. */
export default function LabelOptionsSection({ category, title, description, emptyText }: LabelOptionsSectionProps) {
  const list = usePayrollOptionList(category);
  const { pendingId, errors, run, clearError } = useOptionActions();
  const [editing, setEditing] = useState<string | null>(null);
  const noun = PAYROLL_OPTION_CATEGORY_LABELS[category];
  const headingId = `payroll-options-${category}`;
  const rows = orderRows(list.data ?? []);
  const locked = pendingId !== null || editing !== null;

  const save = async (rowId: string, action: () => Promise<unknown>) => {
    if (await run(rowId, action)) setEditing(null);
  };
  const stopEditing = (rowId: string) => {
    clearError(rowId);
    setEditing(null);
  };

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        </div>
        <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing(NEW_ROW)} disabled={locked || !list.data}>
          Add {noun}
        </Button>
      </div>

      {editing === NEW_ROW && (
        <LabelForm
          initialLabel=""
          busy={pendingId === NEW_ROW}
          serverError={errors[NEW_ROW]}
          submitLabel={`Add ${noun}`}
          noun={noun}
          onSubmit={(label) => void save(NEW_ROW, () => createPayrollOption(category, { label }))}
          onCancel={() => stopEditing(NEW_ROW)}
        />
      )}

      {list.isLoading && (
        <div className="space-y-2" aria-label={`Loading ${title.toLowerCase()}`}>
          {[0, 1].map((row) => <div key={row} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--card-surface)]" />)}
        </div>
      )}
      {list.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <span>Could not load this list. {list.error instanceof Error ? list.error.message : ""}</span>
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={() => void list.refetch()}>Try again</Button>
        </div>
      )}
      {list.data && rows.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">{emptyText}</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] px-3">
          {rows.map((row) => editing === row.id ? (
            <li key={row.id} className="py-3">
              <LabelForm
                initialLabel={row.label}
                busy={pendingId === row.id}
                serverError={errors[row.id]}
                submitLabel="Save"
                noun={noun}
                onSubmit={(label) => void save(row.id, () => updatePayrollOption(category, row.id, { label }))}
                onCancel={() => stopEditing(row.id)}
              />
            </li>
          ) : (
            <OptionListRow
              key={row.id}
              title={row.label}
              detail={row.label !== row.value ? `Saved on profiles as "${row.value}"` : undefined}
              isDefault={row.isDefault}
              archived={row.archived}
              inUseCount={row.inUseCount}
              busy={pendingId === row.id}
              locked={locked && pendingId !== row.id}
              error={errors[row.id]}
              onEdit={() => {
                clearError(row.id);
                setEditing(row.id);
              }}
              onSetDefault={() => void run(row.id, () => updatePayrollOption(category, row.id, { isDefault: true }))}
              onArchive={() => void run(row.id, () => updatePayrollOption(category, row.id, { archived: true }))}
              onRestore={() => void run(row.id, () => updatePayrollOption(category, row.id, { archived: false }))}
              onDelete={() => void run(row.id, () => deletePayrollOption(category, row.id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
