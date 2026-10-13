/**
 * Generate Payslip Modal.
 *
 * Shows the server's own preview (GET /payroll/preview-calculation) for the
 * period the payslip goes into: base pay, approved overtime, unapproved
 * overtime and gross, exactly as the server returns them. By default it sends
 * no hours, so the server builds the payslip the same way. "Override hours"
 * (off by default) replaces the regular-hours line only.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronDown, Loader2, PhilippinePeso, Plus, Save, User, X } from "lucide-react";
import Modal from "@/components/Modal";
import type { Employee } from "@/lib/payroll-calendar/types";
import { apiFetch } from "@/lib/api";
import { currentSemiMonthlyDayKeys, formatPayrollDate, payrollPeriodDayKey } from "@/lib/payroll-dates";
import {
  buildGeneratePayslipBody,
  previewBasePay,
  previewGrossPay,
  totalDeductions,
  type GenerateDeductionInput,
  type GeneratePayslipBody,
  type PayslipPreview,
} from "@/lib/payslip-generate";

interface GeneratePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (body: GeneratePayslipBody) => void;
  selectedEmployee?: Employee | null;
  employees: Employee[];
  /** The period the payslip is generated into (the active period). */
  period?: { startDate: string; endDate: string } | null;
}

const fieldClass =
  "w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

function money(value: number) {
  return `PHP ${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function hrs(value?: number) {
  return `${(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} h`;
}

function periodDayKeys(period: GeneratePayslipModalProps["period"]) {
  const start = payrollPeriodDayKey(period?.startDate, "start");
  const end = payrollPeriodDayKey(period?.endDate, "end");
  return start && end ? { start, end } : currentSemiMonthlyDayKeys();
}

function Row({ label, detail, value, tone }: { label: string; detail?: string; value: string; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 border-t border-[var(--border)] first:border-t-0">
      <div>
        <p className={`text-sm font-medium ${tone ?? "text-[var(--foreground)]"}`}>{label}</p>
        {detail && <p className="text-[11px] text-[var(--muted)] mt-0.5">{detail}</p>}
      </div>
      <span className={`text-sm font-semibold whitespace-nowrap ${tone ?? "text-[var(--foreground)]"}`}>{value}</span>
    </div>
  );
}

function usePayslipPreview(employeeId: string, start: string, end: string, isOpen: boolean) {
  const [preview, setPreview] = useState<PayslipPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!employeeId || !isOpen) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ userId: employeeId, startDate: start, endDate: end });
      const res = await apiFetch(`/payroll/preview-calculation?${query.toString()}`);
      setPreview(await res.json());
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not load the pay preview.");
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, start, end, isOpen]);

  useEffect(() => {
    load();
  }, [load]);

  return { preview, error, isLoading };
}

export default function GeneratePayslipModal({
  isOpen,
  onClose,
  onGenerate,
  selectedEmployee,
  employees,
  period,
}: GeneratePayslipModalProps) {
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id?.toString() ?? "");
  const [overrideHours, setOverrideHours] = useState(false);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [deductions, setDeductions] = useState<GenerateDeductionInput[]>([]);
  const { start, end } = periodDayKeys(period);
  const { preview, error, isLoading } = usePayslipPreview(employeeId, start, end, isOpen);

  useEffect(() => {
    if (selectedEmployee) setEmployeeId(selectedEmployee.id.toString());
    else if (employees.length > 0) setEmployeeId((current) => current || employees[0].id.toString());
  }, [selectedEmployee, employees]);

  // A new employee or period starts from the automatic numbers again.
  useEffect(() => {
    setOverrideHours(false);
    setHoursWorked(preview?.billableHours ?? 0);
  }, [preview]);

  const state = { overrideHours, hoursWorked, deductions };
  const grossPay = preview ? previewGrossPay(preview, state) : 0;
  const deductionTotal = totalDeductions(deductions);
  const employee = employees.find((e) => e.id.toString() === employeeId);
  const isFixed = preview?.payBasis === "fixed_monthly";

  const updateDeduction = (index: number, patch: Partial<GenerateDeductionInput>) =>
    setDeductions((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeId || !preview) return;
    onGenerate(buildGeneratePayslipBody(state));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
            <PhilippinePeso className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] leading-tight">Generate payslip</h2>
            <p className="text-xs text-[var(--muted)]">{employee ? `For ${employee.name}` : "Select an employee to get started"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[65vh] chat-scroll">
            <div>
              <label htmlFor="payslip-employee" className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
                <User className="w-3.5 h-3.5" /> Employee
              </label>
              <div className="relative">
                <select id="payslip-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`${fieldClass} appearance-none pr-8`} required>
                  <option value="" disabled>Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id.toString()}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <CalendarDays className="w-4 h-4 text-[var(--muted)]" />
              <span>Pay period: <strong>{formatPayrollDate(start)} to {formatPayrollDate(end)}</strong></span>
            </div>

            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {isLoading && !preview && (
              <p className="flex items-center gap-2 text-sm text-[var(--muted)]"><Loader2 className="w-4 h-4 animate-spin" /> Loading the pay preview.</p>
            )}

            {preview && (
              <div className={`rounded-xl border border-[var(--border)] overflow-hidden ${isLoading ? "opacity-60" : ""}`}>
                <Row
                  label={isFixed ? "Fixed salary" : "Regular hours"}
                  detail={`${preview.payBasisLabel ?? "Pay basis"}. ${hrs(overrideHours ? hoursWorked : preview.billableHours)} billable of ${hrs(preview.totalHours)} tracked${isFixed ? "" : ` at ${money(preview.hourlyRate ?? 0)} per hour`}.`}
                  value={money(previewBasePay(preview, state))}
                />
                <Row
                  label="Approved overtime"
                  detail={`${hrs(preview.overtimeApprovedHours)} at ${preview.overtimeMultiplier ?? 1.25}x`}
                  value={money(preview.overtimePay ?? 0)}
                />
                <Row label="Unapproved overtime, not paid" detail={hrs(preview.overtimePendingHours)} value={money(0)} tone="text-[var(--muted)]" />
                <Row label="Gross pay" value={money(grossPay)} tone="text-emerald-700 dark:text-emerald-400" />
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input type="checkbox" checked={overrideHours} onChange={(e) => setOverrideHours(e.target.checked)} disabled={!preview} />
                Override hours
              </label>
              {overrideHours && (
                <div>
                  <input
                    type="number"
                    aria-label="Regular hours for this payslip"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                    className={fieldClass}
                    min="0"
                    step="0.25"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    {isFixed
                      ? "Fixed salary does not depend on hours. Approved overtime is still paid."
                      : "Replaces the regular hours line only. Approved overtime is still paid."}
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Deductions</span>
                <button
                  type="button"
                  onClick={() => setDeductions((rows) => [...rows, { type: "other", name: "", amount: 0 }])}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <Plus className="w-3 h-3" /> Add deduction
                </button>
              </div>
              {deductions.length === 0 ? (
                <p className="text-center py-3 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] text-xs">No deductions.</p>
              ) : (
                <div className="space-y-2">
                  {deductions.map((row, i) => (
                    <div key={i} className="flex gap-2 items-center rounded-lg px-3 py-2 border border-[var(--border)]">
                      <select value={row.type} onChange={(e) => updateDeduction(i, { type: e.target.value })} aria-label={`Deduction ${i + 1} type`} className="text-xs py-1 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]">
                        <option value="tax">Tax</option>
                        <option value="insurance">Insurance</option>
                        <option value="retirement">Retirement</option>
                        <option value="other">Other</option>
                      </select>
                      <input type="text" value={row.name} onChange={(e) => updateDeduction(i, { name: e.target.value })} placeholder="Description" aria-label={`Deduction ${i + 1} description`} className="flex-1 text-xs py-1 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]" />
                      <input type="number" value={row.amount === 0 ? "" : row.amount} onChange={(e) => updateDeduction(i, { amount: e.target.value === "" ? 0 : Number(e.target.value) })} placeholder="0" min="0" aria-label={`Deduction ${i + 1} amount`} className="w-24 text-xs py-1 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]" />
                      <button type="button" onClick={() => setDeductions((rows) => rows.filter((_, idx) => idx !== i))} className="p-1 text-red-500 rounded" aria-label={`Remove deduction ${i + 1}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center justify-between">
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Gross {money(grossPay)}{deductionTotal > 0 ? `, less ${money(deductionTotal)} deductions` : ""}
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase text-blue-700 dark:text-blue-300">Net pay</p>
                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{money(grossPay - deductionTotal)}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--card-bg)]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--card-surface)]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!preview || isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> Generate payslip
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
