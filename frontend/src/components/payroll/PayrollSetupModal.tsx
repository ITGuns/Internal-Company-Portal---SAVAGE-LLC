/**
 * PayrollSetupModal — Payroll Setup Wizard
 *
 * Step 1: Employment type, salary, currency, payment frequency
 * Step 2: Payroll scheme, max billable hours/day
 * Step 3: Live rate preview (daily & hourly rate auto-calculated)
 *
 * Saves to POST /payroll/config/:userId
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Clock,
  Calculator,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle,
  Loader2,
  Info,
} from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import type { Employee } from "@/lib/payroll-calendar/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYROLL_SCHEMES = [
  {
    value: "weekdays",
    label: "Weekdays credited",
    description: "Pay is divided by the number of weekdays in the month",
  },
  {
    value: "flat_30",
    label: "Flat 30 days",
    description: "Pay is divided by 30 days regardless of month length",
  },
  {
    value: "flat_20",
    label: "Flat 20 days",
    description: "Pay is divided by 20 working days",
  },
  {
    value: "flat_160_hours",
    label: "Flat 160 hours",
    description: "Pay is divided by 160 hours per month",
  },
];

const CURRENCIES = [
  { value: "PHP", label: "PHP — Philippine Peso (₱)" },
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "SGD", label: "SGD — Singapore Dollar (S$)" },
  { value: "AUD", label: "AUD — Australian Dollar (A$)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
];

const PAYMENT_FREQUENCIES = [
  { value: "Semi-Monthly", label: "Semi-Monthly (twice a month)" },
  { value: "Monthly", label: "Monthly (once a month)" },
  { value: "Bi-Weekly", label: "Bi-Weekly (every 2 weeks)" },
  { value: "Weekly", label: "Weekly" },
];

const EMPLOYMENT_TYPES = [
  { value: "Full-Time", label: "Full-Time" },
  { value: "Part-Time", label: "Part-Time" },
  { value: "Contractor", label: "Contractor / Freelance" },
  { value: "Intern", label: "Intern" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSaved?: (employeeId: string) => void;
}

interface PayrollConfig {
  jobTitle: string;
  employmentType: string;
  baseSalary: string;
  currency: string;
  paymentFrequency: string;
  payrollScheme: string;
  maxBillableHoursPerDay: string;
  bankAccount: string;
  taxId: string;
}

// ─── Rate Calculator ──────────────────────────────────────────────────────────

function calculateRates(
  baseSalary: number,
  payrollScheme: string,
  maxBillableHoursPerDay: number
) {
  if (!baseSalary || baseSalary <= 0) return null;
  const hours = maxBillableHoursPerDay > 0 ? maxBillableHoursPerDay : 8;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let weekdays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++;
  }

  if (payrollScheme === "flat_160_hours") {
    const hourlyRate = baseSalary / 160;
    return {
      divisor: "160 hours/month",
      dailyRate: hourlyRate * hours,
      hourlyRate,
    };
  }
  const divisorDays =
    payrollScheme === "flat_30"
      ? 30
      : payrollScheme === "flat_20"
        ? 20
        : weekdays;
  const dailyRate = divisorDays > 0 ? baseSalary / divisorDays : 0;
  return {
    divisor:
      payrollScheme === "weekdays"
        ? `${weekdays} weekdays (this month)`
        : `${divisorDays} days`,
    dailyRate,
    hourlyRate: hours > 0 ? dailyRate / hours : 0,
  };
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Employment", icon: DollarSign },
  { id: 2, label: "Schedule", icon: Clock },
  { id: 3, label: "Preview", icon: Calculator },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollSetupModal({
  isOpen,
  onClose,
  employee,
  onSaved,
}: PayrollSetupModalProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const [config, setConfig] = useState<PayrollConfig>({
    jobTitle: "",
    employmentType: "Full-Time",
    baseSalary: "",
    currency: "PHP",
    paymentFrequency: "Semi-Monthly",
    payrollScheme: "weekdays",
    maxBillableHoursPerDay: "8",
    bankAccount: "",
    taxId: "",
  });

  // Load existing payroll config when employee changes
  const loadConfig = useCallback(async () => {
    if (!employee?.id) return;
    setIsLoadingConfig(true);
    try {
      const res = await apiFetch(`/payroll/config/${employee.id}`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          jobTitle: data.jobTitle || "",
          employmentType: data.employmentType || "Full-Time",
          baseSalary: data.baseSalary != null ? String(data.baseSalary) : "",
          currency: data.currency || "PHP",
          paymentFrequency: data.paymentFrequency || "Semi-Monthly",
          payrollScheme: data.payrollScheme || "weekdays",
          maxBillableHoursPerDay: data.maxBillableHoursPerDay != null ? String(data.maxBillableHoursPerDay) : "8",
          bankAccount: data.bankAccount || "",
          taxId: data.taxId || "",
        });
      }
    } catch {
      // silently ignore — form will show defaults
    } finally {
      setIsLoadingConfig(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (isOpen && employee) {
      setStep(1);
      loadConfig();
    }
  }, [isOpen, employee, loadConfig]);

  const updateConfig = (key: keyof PayrollConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!employee?.id) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        jobTitle: config.jobTitle || undefined,
        employmentType: config.employmentType,
        baseSalary: config.baseSalary ? parseFloat(config.baseSalary) : undefined,
        currency: config.currency,
        paymentFrequency: config.paymentFrequency,
        payrollScheme: config.payrollScheme,
        maxBillableHoursPerDay: parseFloat(config.maxBillableHoursPerDay) || 8,
        bankAccount: config.bankAccount || undefined,
        taxId: config.taxId || undefined,
      };

      const res = await apiFetch(`/payroll/config/${employee.id}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save payroll config");
      }

      toast.success(`Payroll setup saved for ${employee.name}`);
      onSaved?.(String(employee.id));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payroll config");
    } finally {
      setIsSaving(false);
    }
  };

  // Rate preview calculation
  const salary = parseFloat(config.baseSalary) || 0;
  const hours = parseFloat(config.maxBillableHoursPerDay) || 8;
  const rates = calculateRates(salary, config.payrollScheme, hours);
  const currencySymbol =
    config.currency === "PHP" ? "₱"
      : config.currency === "USD" ? "$"
        : config.currency === "EUR" ? "€"
          : config.currency === "SGD" ? "S$"
            : config.currency === "AUD" ? "A$"
              : config.currency === "GBP" ? "£"
                : config.currency;

  const canProceedStep1 = config.baseSalary.trim() !== "" && parseFloat(config.baseSalary) > 0;

  const inputClass =
    "w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all";
  const labelClass = "block text-sm font-semibold mb-2 text-[var(--foreground)]";

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payroll Setup" size="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--border)]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Payroll Setup
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Configure rate rules for{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {employee.name}
              </span>
            </p>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => isDone && setStep(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : isDone
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-200"
                      : "bg-[var(--card-surface)] text-[var(--muted)] cursor-default"
                    }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all ${step > s.id ? "bg-emerald-400" : "bg-[var(--border)]"}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* ── Step 1: Employment & Salary ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Job Title</label>
                    <input
                      type="text"
                      value={config.jobTitle}
                      onChange={(e) => updateConfig("jobTitle", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Employment Type</label>
                    <select
                      value={config.employmentType}
                      onChange={(e) => updateConfig("employmentType", e.target.value)}
                      className={inputClass}
                    >
                      {EMPLOYMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Monthly Base Salary <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={config.currency}
                      onChange={(e) => updateConfig("currency", e.target.value)}
                      className="p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all w-28 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.value}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={config.baseSalary}
                      onChange={(e) => updateConfig("baseSalary", e.target.value)}
                      className={`${inputClass} flex-1`}
                      placeholder="0.00"
                      min="0"
                      step="any"
                    />
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1.5">
                    Full currency list: {CURRENCIES.find((c) => c.value === config.currency)?.label}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Payment Frequency</label>
                  <select
                    value={config.paymentFrequency}
                    onChange={(e) => updateConfig("paymentFrequency", e.target.value)}
                    className={inputClass}
                  >
                    {PAYMENT_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Bank Account</label>
                    <input
                      type="text"
                      value={config.bankAccount}
                      onChange={(e) => updateConfig("bankAccount", e.target.value)}
                      className={inputClass}
                      placeholder="Account number (optional)"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tax ID</label>
                    <input
                      type="text"
                      value={config.taxId}
                      onChange={(e) => updateConfig("taxId", e.target.value)}
                      className={inputClass}
                      placeholder="TIN / Tax ID (optional)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Payroll Scheme ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Max Billable Hours / Day <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={config.maxBillableHoursPerDay}
                    onChange={(e) => updateConfig("maxBillableHoursPerDay", e.target.value)}
                    className={inputClass}
                    min="0.25"
                    max="24"
                    step="0.25"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1.5">
                    Hours worked beyond this cap per day are tracked as pending overtime.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>
                    Salary Divisor Scheme <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {PAYROLL_SCHEMES.map((scheme) => (
                      <button
                        key={scheme.value}
                        type="button"
                        onClick={() => updateConfig("payrollScheme", scheme.value)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${config.payrollScheme === scheme.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-[var(--border)] hover:border-blue-300 bg-[var(--background)]"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[var(--foreground)]">
                            {scheme.label}
                          </span>
                          {config.payrollScheme === scheme.value && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {scheme.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Rate Preview ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Review the auto-calculated rates below. These are used when generating
                    payslips automatically from time entries.
                  </p>
                </div>

                {/* Config summary */}
                <div className="bg-[var(--card-surface)] rounded-xl border border-[var(--border)] p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Employee</span>
                    <span className="font-semibold text-[var(--foreground)]">{employee.name}</span>
                  </div>
                  {config.jobTitle && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Job Title</span>
                      <span className="font-semibold text-[var(--foreground)]">{config.jobTitle}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Employment Type</span>
                    <span className="font-semibold text-[var(--foreground)]">{config.employmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Monthly Salary</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {currencySymbol}{salary.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Currency</span>
                    <span className="font-semibold text-[var(--foreground)]">{config.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Payment Frequency</span>
                    <span className="font-semibold text-[var(--foreground)]">{config.paymentFrequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Scheme</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {PAYROLL_SCHEMES.find((s) => s.value === config.payrollScheme)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Max billable hrs/day</span>
                    <span className="font-semibold text-[var(--foreground)]">{config.maxBillableHoursPerDay} hrs</span>
                  </div>
                </div>

                {/* Rate preview cards */}
                {rates ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
                      <p className="text-xs text-[var(--muted)] mb-1">Daily Rate</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}{rates.dailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-[var(--muted)] mt-1">÷ {rates.divisor}</p>
                    </div>
                    <div className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                      <p className="text-xs text-[var(--muted)] mb-1">Hourly Rate</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {currencySymbol}{rates.hourlyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-[var(--muted)] mt-1">per billable hour</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                    Enter a monthly salary to see the auto-calculated rates.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 justify-between pt-6 mt-4 border-t border-[var(--border)]">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              icon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canProceedStep1}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={isSaving || isLoadingConfig}
            >
              {isSaving ? "Saving…" : "Save Payroll Setup"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
