"use client";

import React, { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import { formatTaxRate, getDefaultTaxRule, taxRuleToDraft, type PayrollTaxRuleRow } from "@/lib/payroll-tax";
import { createPayrollTaxRule, deletePayrollTaxRule, updatePayrollTaxRule } from "@/lib/payroll-options-api";
import OptionListRow from "./OptionListRow";
import TaxRuleOptionForm from "./TaxRuleOptionForm";
import { useOptionActions } from "./useOptionActions";
import { usePayrollTaxRules } from "./usePayrollOptions";

const NEW_ROW = "new-tax-rule";

/** Active rows first, then archived ones, each by sort order. */
function orderRows(rows: readonly PayrollTaxRuleRow[]): PayrollTaxRuleRow[] {
  return [...rows].sort((left, right) => Number(left.archived) - Number(right.archived) || left.sortOrder - right.sortOrder);
}

/**
 * "Tax rules" section of Payroll options (2026-10-28): withholding as a percent
 * of gross pay. The default applies to everyone set to follow it; without a
 * default nobody is taxed unless their setup names a rule.
 */
export default function TaxRuleOptionsSection() {
  const rules = usePayrollTaxRules();
  const { pendingId, errors, run, clearError } = useOptionActions();
  const [editing, setEditing] = useState<string | null>(null);
  const rows = orderRows(rules.data ?? []);
  const locked = pendingId !== null || editing !== null;
  const fallback = getDefaultTaxRule(rules.data);

  const save = async (rowId: string, action: () => Promise<unknown>) => {
    if (await run(rowId, action)) setEditing(null);
  };

  return (
    <section aria-labelledby="payroll-options-tax-rules" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h3 id="payroll-options-tax-rules" className="text-base font-semibold text-[var(--foreground)]">Tax rules</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Withholding taken from gross pay on each payslip. The default applies to everyone on &quot;Workspace default&quot;; Set Up Payroll can pick another rule or no tax per person. A flat rate on gross earnings before deductions, as used for contractors&apos; expanded withholding. Graduated employee withholding is not computed.
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing(NEW_ROW)} disabled={locked || !rules.data}>
          Add tax rule
        </Button>
      </div>

      {rules.data && (
        <p className="text-xs text-[var(--foreground)]">
          Workspace default: {fallback ? `${fallback.name}, ${formatTaxRate(fallback.rate)}%` : "none, so profiles on the default are not taxed"}.
        </p>
      )}

      {editing === NEW_ROW && (
        <TaxRuleOptionForm
          busy={pendingId === NEW_ROW}
          serverError={errors[NEW_ROW]}
          submitLabel="Add tax rule"
          onSubmit={(payload) => void save(NEW_ROW, () => createPayrollTaxRule(payload))}
          onCancel={() => {
            clearError(NEW_ROW);
            setEditing(null);
          }}
        />
      )}

      {rules.isLoading && (
        <div className="space-y-2" aria-label="Loading tax rules">
          {[0, 1].map((row) => <div key={row} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--card-surface)]" />)}
        </div>
      )}
      {rules.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <span>Could not load the tax rules. {rules.error instanceof Error ? rules.error.message : ""}</span>
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={() => void rules.refetch()}>Try again</Button>
        </div>
      )}
      {rules.data && rows.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
          No tax rules yet, so payslips have no withholding. Add one if the organization taxes its employees.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] px-3">
          {rows.map((row) => editing === row.id ? (
            <li key={row.id} className="py-3">
              <TaxRuleOptionForm
                initial={taxRuleToDraft(row)}
                inUseCount={row.inUseCount}
                busy={pendingId === row.id}
                serverError={errors[row.id]}
                submitLabel="Save tax rule"
                onSubmit={(payload) => void save(row.id, () => updatePayrollTaxRule(row.id, payload))}
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
              detail={`${formatTaxRate(row.rate)}% of gross pay${row.isDefault ? ", for everyone on the workspace default" : ""}`}
              isDefault={row.isDefault}
              archived={row.archived}
              // "Not in use" would read as "nobody is taxed" on the default, which applies to everyone on it.
              inUseCount={row.isDefault ? undefined : row.inUseCount}
              busy={pendingId === row.id}
              locked={locked && pendingId !== row.id}
              error={errors[row.id]}
              onEdit={() => {
                clearError(row.id);
                setEditing(row.id);
              }}
              onSetDefault={() => void run(row.id, () => updatePayrollTaxRule(row.id, { isDefault: true }))}
              onClearDefault={() => void run(row.id, () => updatePayrollTaxRule(row.id, { isDefault: false }))}
              onArchive={() => void run(row.id, () => updatePayrollTaxRule(row.id, { archived: true }))}
              onRestore={() => void run(row.id, () => updatePayrollTaxRule(row.id, { archived: false }))}
              onDelete={() => void run(row.id, () => deletePayrollTaxRule(row.id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
