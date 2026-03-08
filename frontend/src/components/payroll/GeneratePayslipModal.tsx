/**
 * Generate Payslip Modal - Redesigned with editable + auto-calculated hours
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PhilippinePeso,
  Save,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Clock,
  User,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import Modal from "@/components/Modal";
import type { Deduction, Employee } from "@/lib/payroll-calendar/types";
import { apiFetch } from "@/lib/api";

interface GeneratePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (payslipData: {
    employeeId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    hoursWorked: number;
    grossPay: number;
    deductions: Deduction[];
    netPay: number;
  }) => void;
  selectedEmployee?: Employee | null;
  employees: Employee[];
}

// ── helpers ─────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ────────────────────────────────────────────

export default function GeneratePayslipModal({
  isOpen,
  onClose,
  onGenerate,
  selectedEmployee,
  employees,
}: GeneratePayslipModalProps) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id?.toString() ?? "");
  const [payPeriodStart, setPayPeriodStart] = useState(firstDay.toISOString().split("T")[0]);
  const [payPeriodEnd, setPayPeriodEnd] = useState(lastDay.toISOString().split("T")[0]);
  const [hoursWorked, setHoursWorked] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);   // derived from preview
  const [grossPay, setGrossPay] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hoursManual, setHoursManual] = useState(false);       // true = user edited manually

  const [customDeductions, setCustomDeductions] = useState<Omit<Deduction, "id">[]>([]);

  // Sync employee on prop change
  useEffect(() => {
    if (selectedEmployee) {
      setEmployeeId(selectedEmployee.id.toString());
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id.toString());
    }
  }, [selectedEmployee, employees]);

  // ── Fetch preview from backend ──────────────────────────
  const fetchPreview = useCallback(async (overrideHours?: number) => {
    if (!employeeId || !payPeriodStart || !payPeriodEnd) return;
    setIsCalculating(true);
    try {
      const res = await apiFetch(
        `/payroll/preview-calculation?userId=${employeeId}&startDate=${payPeriodStart}&endDate=${payPeriodEnd}`
      );
      if (res.ok) {
        const data = await res.json();
        const hrs = overrideHours ?? data.totalHours ?? 0;
        const rate = data.grossPay && data.totalHours
          ? data.grossPay / data.totalHours
          : 0;
        setHourlyRate(rate);
        if (!hoursManual || overrideHours !== undefined) {
          setHoursWorked(hrs);
          setHoursManual(false);
        }
        // Recalculate gross with whatever hours we have
        const effectiveHrs = hoursManual && overrideHours === undefined
          ? hoursWorked
          : (data.totalHours ?? 0);
        setGrossPay(rate * effectiveHrs);
      }
    } catch (err) {
      console.error("Preview fetch failed", err);
    } finally {
      setIsCalculating(false);
    }
  }, [employeeId, payPeriodStart, payPeriodEnd, hoursManual, hoursWorked]);

  // Auto-fetch whenever employee or dates change
  useEffect(() => {
    setHoursManual(false);
    fetchPreview();
  }, [employeeId, payPeriodStart, payPeriodEnd]);

  // Recalculate gross when hours are edited manually
  useEffect(() => {
    if (hoursManual && hourlyRate > 0) {
      setGrossPay(hourlyRate * hoursWorked);
    }
  }, [hoursWorked, hourlyRate, hoursManual]);

  // ── Deductions ──────────────────────────────────────────
  const addDeduction = () =>
    setCustomDeductions([...customDeductions, { type: "other", name: "", amount: 0 }]);

  const removeDeduction = (i: number) =>
    setCustomDeductions(customDeductions.filter((_, idx) => idx !== i));

  const updateDeduction = (i: number, field: keyof Omit<Deduction, "id">, val: string | number) =>
    setCustomDeductions(customDeductions.map((d, idx) => idx === i ? { ...d, [field]: val } : d));

  const totalDeductions = customDeductions.reduce((s, d) => s + d.amount, 0);
  const netPay = grossPay - totalDeductions;

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    onGenerate({
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      hoursWorked,
      grossPay,
      deductions: customDeductions.map((d, i) => ({ ...d, id: `ded${i}` })),
      netPay,
    });
    onClose();
  };

  const employee = employees.find((e) => e.id.toString() === employeeId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="flex flex-col">

        {/* ── Modal Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
              <PhilippinePeso className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)] leading-tight">Generate Payslip</h2>
              <p className="text-xs text-[var(--muted)]">
                {employee ? `For ${employee.name}` : "Select an employee to get started"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[65vh] chat-scroll">

            {/* Employee */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
                <User className="w-3.5 h-3.5" /> Employee
              </label>
              <div className="relative">
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 appearance-none"
                  required
                >
                  <option value="" disabled>Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id.toString()}>
                      {emp.name} — {emp.role}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
              </div>
            </div>

            {/* Pay Period */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Pay Period
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--muted)] mb-1">Start</p>
                  <input
                    type="date"
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] mb-1">End</p>
                  <input
                    type="date"
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Hours Worked — editable + auto */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" /> Hours Worked
                </label>
                <div className="flex items-center gap-2">
                  {hoursManual && (
                    <span className="text-[10px] text-amber-500 font-medium">Manually set</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setHoursManual(false); fetchPreview(undefined); }}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:opacity-75 transition-opacity"
                    title="Re-fetch calculated hours"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCalculating ? "animate-spin" : ""}`} />
                    {isCalculating ? "Calculating…" : "Auto-calculate"}
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={hoursWorked === 0 && !hoursManual ? "" : hoursWorked}
                  onChange={(e) => {
                    setHoursManual(true);
                    setHoursWorked(e.target.value === "" ? 0 : parseFloat(e.target.value));
                  }}
                  placeholder={isCalculating ? "Calculating…" : "Enter or auto-calculate hours"}
                  className={`w-full pl-3 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors ${hoursManual
                    ? "border-amber-400 focus:ring-amber-400/30 bg-amber-50 dark:bg-amber-900/10 text-[var(--foreground)]"
                    : "border-[var(--border)] focus:ring-emerald-500/40 bg-[var(--background)] text-[var(--foreground)]"
                    } ${isCalculating ? "animate-pulse" : ""}`}
                  min="0"
                  step="0.5"
                />
                {isCalculating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Auto-filled from Daily Logs and Timers. You can override this value manually.
              </p>
            </div>

            {/* Gross Pay */}
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Gross Pay</p>
              </div>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ₱{fmt(grossPay)}
              </span>
            </div>

            {/* Deductions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Deductions</label>
                <button
                  type="button"
                  onClick={addDeduction}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Deduction
                </button>
              </div>

              {customDeductions.length === 0 ? (
                <div className="text-center py-4 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] text-xs">
                  No deductions added. Click "Add Deduction" to add one.
                </div>
              ) : (
                <div className="space-y-2">
                  {customDeductions.map((ded, i) => (
                    <div key={i} className="flex gap-2 items-center bg-[var(--card-surface)] rounded-lg px-3 py-2 border border-[var(--border)]">
                      <select
                        value={ded.type}
                        onChange={(e) => updateDeduction(i, "type", e.target.value)}
                        className="text-xs py-1 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      >
                        <option value="tax">Tax</option>
                        <option value="insurance">Insurance</option>
                        <option value="retirement">Retirement</option>
                        <option value="other">Other</option>
                      </select>

                      <input
                        type="text"
                        value={ded.name}
                        onChange={(e) => updateDeduction(i, "name", e.target.value)}
                        placeholder="Description"
                        className="flex-1 text-xs py-1 px-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />

                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">₱</span>
                        <input
                          type="number"
                          value={ded.amount === 0 ? "" : ded.amount}
                          onChange={(e) => updateDeduction(i, "amount", e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0"
                          className="w-24 text-xs py-1 pl-5 pr-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          min="0"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDeduction(i)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary strip */}
            <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
              <div className="px-4 py-2 border-b border-blue-200 dark:border-blue-800 flex justify-between text-xs text-blue-700 dark:text-blue-400">
                <span>Gross Pay</span>
                <span className="font-semibold">₱{fmt(grossPay)}</span>
              </div>
              {totalDeductions > 0 && (
                <div className="px-4 py-2 border-b border-blue-200 dark:border-blue-800 flex justify-between text-xs text-red-600 dark:text-red-400">
                  <span>Total Deductions</span>
                  <span className="font-semibold">-₱{fmt(totalDeductions)}</span>
                </div>
              )}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Net Pay</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">₱{fmt(netPay)}</span>
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--card-bg)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--card-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
            >
              <Save className="w-4 h-4" />
              Generate Payslip
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
