/**
 * Pure helpers for Set Up Payroll (PayrollSetupModal) and the views that show
 * an employee's pay setup. GET/POST /payroll/config/:userId carry the profile.
 * No runtime imports so node --test can load this file directly.
 */

import type { Employee } from "./payroll-calendar/types";

/** The fields of GET /payroll/config/:userId the payroll screens use. */
export interface PayrollProfile {
  userId?: string;
  jobTitle?: string | null;
  employmentType?: string | null;
  baseSalary?: number | null;
  currency?: string | null;
  paymentFrequency?: string | null;
  payrollScheme?: string | null;
  maxBillableHoursPerDay?: number | null;
  payBasis?: string | null;
  hourlyRate?: number | null;
  overtimeMultiplier?: number | null;
  bankAccount?: string | null;
  taxId?: string | null;
  /** Withholding tax (2026-10-28): null = workspace default, "none" = no tax, else a rule key. */
  taxRule?: string | null;
}

/** Form state: every field is the text of its input. */
export interface PayrollSetupForm {
  jobTitle: string;
  employmentType: string;
  baseSalary: string;
  currency: string;
  paymentFrequency: string;
  payrollScheme: string;
  maxBillableHoursPerDay: string;
  bankAccount: string;
  taxId: string;
  payBasis: string;
  hourlyRate: string;
  overtimeMultiplier: string;
  /** "" follows the workspace default rule, "none" is no tax, else a rule key. */
  taxRule: string;
}

/** Values a profile without a stored value falls back to: the list defaults. */
export interface PayrollSetupDefaults {
  payrollScheme: string;
  employmentType: string;
  paymentFrequency: string;
}

export const DEFAULT_CAP_HOURS = 8;
export const MIN_CAP_HOURS = 0.25;
export const MAX_CAP_HOURS = 24;
const DEFAULT_CURRENCY = "PHP";
const DEFAULT_PAY_BASIS = "hourly_from_monthly";
const DEFAULT_OVERTIME_MULTIPLIER = 1.25;

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function profileToSetupForm(profile: PayrollProfile | null | undefined, defaults: PayrollSetupDefaults): PayrollSetupForm {
  const source = profile ?? {};
  return {
    jobTitle: text(source.jobTitle),
    employmentType: source.employmentType || defaults.employmentType,
    baseSalary: source.baseSalary === null || source.baseSalary === undefined ? "" : String(source.baseSalary),
    currency: source.currency || DEFAULT_CURRENCY,
    paymentFrequency: source.paymentFrequency || defaults.paymentFrequency,
    payrollScheme: source.payrollScheme || defaults.payrollScheme,
    maxBillableHoursPerDay: String(source.maxBillableHoursPerDay ?? DEFAULT_CAP_HOURS),
    bankAccount: text(source.bankAccount),
    taxId: text(source.taxId),
    payBasis: source.payBasis || DEFAULT_PAY_BASIS,
    hourlyRate: text(source.hourlyRate),
    overtimeMultiplier: String(source.overtimeMultiplier ?? DEFAULT_OVERTIME_MULTIPLIER),
    taxRule: text(source.taxRule),
  };
}

/** Error for the daily cap input, or undefined when it is fine. */
export function validateCapHours(value: string): string | undefined {
  const hours = Number(value);
  if (value.trim() === "" || !Number.isFinite(hours)) return "Enter the most billable hours in a day.";
  if (hours < MIN_CAP_HOURS || hours > MAX_CAP_HOURS) return `Use ${MIN_CAP_HOURS} to ${MAX_CAP_HOURS} hours.`;
  return undefined;
}

/**
 * Body for POST /payroll/config/:userId. Blank optional text is left out,
 * never cleared. taxRule is always sent: null puts the profile back on the
 * workspace default.
 */
export function buildSetupPayload(form: PayrollSetupForm): Record<string, unknown> {
  const salary = Number(form.baseSalary);
  return {
    jobTitle: form.jobTitle.trim() || undefined,
    employmentType: form.employmentType || undefined,
    baseSalary: form.baseSalary.trim() !== "" && Number.isFinite(salary) ? salary : undefined,
    currency: form.currency,
    paymentFrequency: form.paymentFrequency || undefined,
    payrollScheme: form.payrollScheme || undefined,
    maxBillableHoursPerDay: Number(form.maxBillableHoursPerDay) || DEFAULT_CAP_HOURS,
    bankAccount: form.bankAccount.trim() || undefined,
    taxId: form.taxId.trim() || undefined,
    payBasis: form.payBasis,
    hourlyRate: form.payBasis === "hourly_rate" ? Number(form.hourlyRate) : undefined,
    overtimeMultiplier: Number(form.overtimeMultiplier),
    taxRule: form.taxRule || null,
  };
}

/** An employee list row with a saved profile applied, so cards update without a refetch. */
export function applyProfileToEmployee(employee: Employee, profile: PayrollProfile): Employee {
  return {
    ...employee,
    role: profile.jobTitle || employee.role,
    salary: profile.baseSalary ?? employee.salary,
    payrollScheme: profile.payrollScheme ?? employee.payrollScheme,
    maxBillableHoursPerDay: profile.maxBillableHoursPerDay ?? employee.maxBillableHoursPerDay,
    payBasis: profile.payBasis ?? employee.payBasis,
    paymentFrequency: profile.paymentFrequency ?? employee.paymentFrequency,
    employmentType: profile.employmentType ?? employee.employmentType,
    currency: profile.currency ?? employee.currency,
    // null is a real value here (the workspace default), so only a missing field keeps the old one.
    taxRule: profile.taxRule !== undefined ? profile.taxRule : employee.taxRule,
  };
}

/** "8 h a day" with up to 2 decimals. */
export function formatCapHours(hours?: number | null): string {
  const value = hours && hours > 0 ? hours : DEFAULT_CAP_HOURS;
  return `${Math.round(value * 100) / 100} h a day`;
}

/** Money in the profile's currency, e.g. "₱25,000.00"; an unknown code falls back to "XYZ 25,000.00". */
export function formatPayAmount(amount: number, currency?: string | null): string {
  const code = currency || DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Parts of the one-line pay summary on an employee card: pay basis, scheme,
 * daily cap, pay frequency and, when it is not the workspace default, the tax
 * choice, with empty parts left out.
 */
export function buildPaySummary(parts: {
  payBasisLabel: string;
  schemeName?: string;
  capHours?: number | null;
  frequencyLabel?: string;
  taxLabel?: string;
}): string[] {
  return [parts.payBasisLabel, parts.schemeName ?? "", formatCapHours(parts.capHours), parts.frequencyLabel ?? "", parts.taxLabel ?? ""]
    .map((part) => part.trim())
    .filter(Boolean);
}
