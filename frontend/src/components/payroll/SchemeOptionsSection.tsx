"use client";

import React, { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import { describeScheme, schemeToDraft, type PayrollSchemeRow } from "@/lib/payroll-options";
import { createPayrollScheme, deletePayrollScheme, updatePayrollScheme } from "@/lib/payroll-options-api";
import OptionListRow from "./OptionListRow";
import SchemeOptionForm from "./SchemeOptionForm";
import { useOptionActions } from "./useOptionActions";
import { usePayrollSchemes } from "./usePayrollOptions";

const NEW_ROW = "new-scheme";

/** Active rows first, then archived ones, each by sort order. */
function orderRows(rows: readonly PayrollSchemeRow[]): PayrollSchemeRow[] {
  return [...rows].sort((left, right) => Number(left.archived) - Number(right.archived) || left.sortOrder - right.sortOrder);
}

/** "Salary divisor schemes" section of Payroll options. */
export default function SchemeOptionsSection() {
  const schemes = usePayrollSchemes();
  const { pendingId, errors, run, clearError } = useOptionActions();
  const [editing, setEditing] = useState<string | null>(null);
  const rows = orderRows(schemes.data ?? []);
  const locked = pendingId !== null || editing !== null;

  const save = async (rowId: string, action: () => Promise<unknown>) => {
    if (await run(rowId, action)) setEditing(null);
  };

  return (
    <section aria-labelledby="payroll-options-schemes" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="payroll-options-schemes" className="text-base font-semibold text-[var(--foreground)]">Salary divisor schemes</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            How a monthly salary becomes a daily and hourly rate, and the most days credited in a month. New employees start on the default.
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing(NEW_ROW)} disabled={locked || !schemes.data}>
          Add scheme
        </Button>
      </div>

      {editing === NEW_ROW && (
        <SchemeOptionForm
          busy={pendingId === NEW_ROW}
          serverError={errors[NEW_ROW]}
          submitLabel="Add scheme"
          onSubmit={(payload) => void save(NEW_ROW, () => createPayrollScheme(payload))}
          onCancel={() => {
            clearError(NEW_ROW);
            setEditing(null);
          }}
        />
      )}

      {schemes.isLoading && (
        <div className="space-y-2" aria-label="Loading schemes">
          {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--card-surface)]" />)}
        </div>
      )}
      {schemes.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <span>Could not load the schemes. {schemes.error instanceof Error ? schemes.error.message : ""}</span>
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={() => void schemes.refetch()}>Try again</Button>
        </div>
      )}
      {schemes.data && rows.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
          No schemes yet. Add one so monthly salaries can be turned into daily and hourly rates.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] px-3">
          {rows.map((row) => editing === row.id ? (
            <li key={row.id} className="py-3">
              <SchemeOptionForm
                initial={schemeToDraft(row)}
                inUseCount={row.inUseCount}
                busy={pendingId === row.id}
                serverError={errors[row.id]}
                submitLabel="Save scheme"
                onSubmit={(payload) => void save(row.id, () => updatePayrollScheme(row.id, payload))}
                onCancel={() => {
                  clearError(row.id);
                  setEditing(null);
                }}
              />
            </li>
          ) : (
            <OptionListRow
              key={row.id}
              title={row.name}
              detail={describeScheme(row)}
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
              onSetDefault={() => void run(row.id, () => updatePayrollScheme(row.id, { isDefault: true }))}
              onArchive={() => void run(row.id, () => updatePayrollScheme(row.id, { archived: true }))}
              onRestore={() => void run(row.id, () => updatePayrollScheme(row.id, { archived: false }))}
              onDelete={() => void run(row.id, () => deletePayrollScheme(row.id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
