"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { LockKeyhole, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { deletePayslip, updatePayslip } from "@/lib/payslips";
import {
  PAYROLL_ITEM_TYPES,
  inferPayrollItemType,
  isPayrollPeriodLocked,
  recomputePayslipTotals,
  toPayslipItemPayload,
  validatePayslipEdit,
  type EditablePayslipItem,
  type PayrollItemType,
  type PayslipEditErrors,
} from "@/lib/payslip-edit";
import { formatCurrency, formatPayPeriod } from "@/lib/payroll-calendar/payslip-utils";
import type { Payslip } from "@/lib/payroll-calendar/types";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "./form-styles";

interface PayslipEditModalProps {
  isOpen: boolean;
  payslip: Payslip | null;
  employeeName: string;
  onClose: () => void;
  onChanged: () => void;
}

let rowCounter = 0;
function nextRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

function toEditableItems(payslip: Payslip | null): EditablePayslipItem[] {
  return (payslip?.items ?? []).map((item) => ({
    key: item.id || nextRowKey(),
    type: inferPayrollItemType(item.type, item.amount),
    description: item.description,
    amount: String(item.type === "deduction" || item.amount < 0 ? Math.abs(item.amount) : item.amount),
  }));
}

const EMPTY_ERRORS: PayslipEditErrors = { rows: {} };

export default function PayslipEditModal({
  isOpen,
  payslip,
  employeeName,
  onClose,
  onChanged,
}: PayslipEditModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [items, setItems] = useState<EditablePayslipItem[]>([]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<PayslipEditErrors>(EMPTY_ERRORS);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setItems(toEditableItems(payslip));
      setNote("");
      setErrors(EMPTY_ERRORS);
      setConfirmingDelete(false);
    }
  }, [isOpen, payslip]);

  const totals = useMemo(() => recomputePayslipTotals(items), [items]);
  const locked = isPayrollPeriodLocked(payslip?.periodStatus);
  const busy = saving || deleting;

  if (!payslip) return null;

  const updateItem = (key: string, patch: Partial<EditablePayslipItem>) => {
    setItems((previous) => previous.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: string) => {
    setItems((previous) => previous.filter((item) => item.key !== key));
  };

  const addItem = () => {
    setItems((previous) => [...previous, { key: nextRowKey(), type: "adjustment", description: "", amount: "" }]);
  };

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!payslip || locked) return;
    const result = validatePayslipEdit(items, note);
    setErrors(result.errors);
    if (!result.valid) return;

    setSaving(true);
    try {
      await updatePayslip(payslip.id, { items: toPayslipItemPayload(items), note });
      toast.success(`Payslip updated for ${employeeName}.`);
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the payslip.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!payslip || locked) return;
    setDeleting(true);
    try {
      await deletePayslip(payslip.id);
      toast.success(`Payslip deleted for ${employeeName}.`);
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the payslip.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit payslip"
      subtitle={`${employeeName}, ${formatPayPeriod(payslip.payPeriodStart, payslip.payPeriodEnd)}`}
      size="lg"
    >
      {locked ? (
        <div role="status" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p>
            This pay period is processed and locked. Payslips in a locked period cannot be edited or deleted.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid gap-4" noValidate>
          {payslip.editedAt && (
            <p className="text-xs text-[var(--muted)]">
              Last edited {new Date(payslip.editedAt).toLocaleString()}
              {payslip.editNote ? `. Note: ${payslip.editNote}` : ""}
            </p>
          )}

          <fieldset className="grid gap-3">
            <legend className={fieldLabelClass}>Line items</legend>
            <p className={fieldHelpClass}>
              Enter deductions as positive numbers. They are subtracted from net pay. Unapproved overtime is shown at 0 and is not paid.
            </p>
            {items.length === 0 && (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                No line items yet.
              </p>
            )}
            {items.map((item, index) => {
              const rowErrors = errors.rows[item.key] || {};
              const rowLabel = `Line ${index + 1}`;
              return (
                <div
                  key={item.key}
                  className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,8rem)_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <label htmlFor={fieldId(`${item.key}-type`)} className="sr-only">{rowLabel} type</label>
                    <select
                      id={fieldId(`${item.key}-type`)}
                      className={fieldInputClass}
                      value={item.type}
                      onChange={(event) => updateItem(item.key, { type: event.target.value as PayrollItemType })}
                      disabled={busy}
                    >
                      {PAYROLL_ITEM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={fieldId(`${item.key}-desc`)} className="sr-only">{rowLabel} description</label>
                    <input
                      id={fieldId(`${item.key}-desc`)}
                      type="text"
                      placeholder="Description"
                      className={fieldInputClass}
                      value={item.description}
                      onChange={(event) => updateItem(item.key, { description: event.target.value })}
                      aria-invalid={Boolean(rowErrors.description)}
                      aria-describedby={rowErrors.description ? fieldId(`${item.key}-desc-error`) : undefined}
                      disabled={busy}
                    />
                    {rowErrors.description && (
                      <p id={fieldId(`${item.key}-desc-error`)} className={fieldErrorClass}>{rowErrors.description}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={fieldId(`${item.key}-amount`)} className="sr-only">{rowLabel} amount</label>
                    <input
                      id={fieldId(`${item.key}-amount`)}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className={`${fieldInputClass} font-mono tabular-nums`}
                      value={item.type === "overtime_pending" ? "0" : item.amount}
                      onChange={(event) => updateItem(item.key, { amount: event.target.value })}
                      aria-invalid={Boolean(rowErrors.amount)}
                      aria-describedby={rowErrors.amount ? fieldId(`${item.key}-amount-error`) : undefined}
                      disabled={busy || item.type === "overtime_pending"}
                    />
                    {rowErrors.amount && (
                      <p id={fieldId(`${item.key}-amount-error`)} className={fieldErrorClass}>{rowErrors.amount}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Remove ${rowLabel.toLowerCase()}`}
                    disabled={busy}
                    className="justify-self-end text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
            {errors.items && <p className={fieldErrorClass}>{errors.items}</p>}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                onClick={addItem}
                disabled={busy}
              >
                Add line item
              </Button>
            </div>
          </fieldset>

          <dl className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-sm">
            <dt className="text-[var(--muted)]">Gross</dt>
            <dd className="text-right font-mono tabular-nums font-semibold">{formatCurrency(totals.gross)}</dd>
            <dt className="text-[var(--muted)]">Net</dt>
            <dd className="text-right font-mono tabular-nums font-semibold">{formatCurrency(totals.net)}</dd>
            <dd className="col-span-2 text-xs text-[var(--muted)]">
              Preview only. The server recalculates totals when you save.
            </dd>
          </dl>

          <div>
            <label htmlFor={fieldId("note")} className={fieldLabelClass}>
              Reason for the change <span className="text-red-500">*</span>
            </label>
            <textarea
              id={fieldId("note")}
              rows={2}
              className={fieldTextareaClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={Boolean(errors.note)}
              aria-describedby={errors.note ? fieldId("note-error") : undefined}
              disabled={busy}
              required
            />
            {errors.note && <p id={fieldId("note-error")} className={fieldErrorClass}>{errors.note}</p>}
          </div>

          {confirmingDelete ? (
            <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm">
              <p className="font-semibold">Delete this payslip?</p>
              <p className="mt-1 text-[var(--muted)]">
                It is removed from this draft period. You can generate it again before the period is locked.
              </p>
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Keep payslip
                </Button>
                <Button type="button" variant="danger" onClick={handleDelete} loading={deleting}>
                  Delete payslip
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="text-red-600 dark:text-red-400"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              >
                Delete payslip
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={saving} disabled={deleting}>
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
