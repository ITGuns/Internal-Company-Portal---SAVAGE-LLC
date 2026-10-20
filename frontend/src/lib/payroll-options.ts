/**
 * Managed payroll lists (2026-10-20): salary divisor schemes and the employment
 * type / pay frequency options, read from GET /payroll/schemes and
 * GET /payroll/options/:category. Rules and messages mirror
 * backend/src/payroll/payroll-options.validation.ts and payroll-schemes.ts.
 * No runtime imports so node --test can load this file directly.
 */

export type PayrollSchemeKind = "weekdays" | "fixed_days" | "fixed_hours";
export type PayrollOptionCategory = "employment_type" | "payment_frequency";

export interface PayrollSchemeRow {
  id: string;
  key: string;
  name: string;
  kind: PayrollSchemeKind | string;
  value: number | null;
  maxCreditedDays: number | null;
  isDefault: boolean;
  sortOrder: number;
  archived: boolean;
  /** Profiles on this scheme; payroll roles only. */
  inUseCount?: number;
}

export interface PayrollOptionRow {
  id: string;
  category: PayrollOptionCategory | string;
  value: string;
  label: string;
  isDefault: boolean;
  sortOrder: number;
  archived: boolean;
  inUseCount?: number;
}

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;
// Below these a divisor is almost surely a typo (2.2 for 22 days) and would multiply rates.
export const MIN_FIXED_DAYS = 10;
export const MAX_FIXED_DAYS = 31;
export const MIN_FIXED_HOURS = 40;
export const MAX_FIXED_HOURS = 744;
export const MIN_CREDITED_DAYS = 1;
export const MAX_CREDITED_DAYS = 31;

export const NAME_LENGTH_MESSAGE = `Use ${NAME_MIN_LENGTH} to ${NAME_MAX_LENGTH} characters.`;
export const KIND_MESSAGE = "Choose how the salary is divided: weekdays of the month, a fixed number of days, or a fixed number of hours.";
export const CREDITED_DAYS_MESSAGE = `Credited days must be between ${MIN_CREDITED_DAYS} and ${MAX_CREDITED_DAYS}, or empty for no cap.`;

export const SCHEME_KIND_OPTIONS: Array<{ value: PayrollSchemeKind; label: string; unit: string }> = [
  { value: "fixed_days", label: "Fixed number of days", unit: "days" },
  { value: "weekdays", label: "Weekdays of the month", unit: "" },
  { value: "fixed_hours", label: "Fixed number of hours", unit: "hours" },
];

export const PAYROLL_OPTION_CATEGORY_LABELS: Record<PayrollOptionCategory, string> = {
  employment_type: "employment type",
  payment_frequency: "pay frequency",
};

export function isSchemeKind(value: unknown): value is PayrollSchemeKind {
  return value === "weekdays" || value === "fixed_days" || value === "fixed_hours";
}

/** 22 -> "22", 21.75 -> "21.75". */
export function formatSchemeNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function bySortOrder<T extends { sortOrder: number }>(left: T, right: T): number {
  return left.sortOrder - right.sortOrder;
}

/** The row for `key`, archived ones included; an unknown or empty key gets the default row. */
export function findScheme(schemes: readonly PayrollSchemeRow[] | undefined, key?: string | null): PayrollSchemeRow | undefined {
  if (!schemes || schemes.length === 0) return undefined;
  return schemes.find((scheme) => scheme.key === key) ?? schemes.find((scheme) => scheme.isDefault);
}

export function getDefaultScheme(schemes: readonly PayrollSchemeRow[] | undefined): PayrollSchemeRow | undefined {
  return schemes?.find((scheme) => scheme.isDefault);
}

/** "Monthly salary divided by 22 days, at most 22 days credited per month". */
export function describeScheme(scheme: Pick<PayrollSchemeRow, "kind" | "value" | "maxCreditedDays">): string {
  const divisor = scheme.kind === "fixed_days" && scheme.value
    ? `${formatSchemeNumber(scheme.value)} days`
    : scheme.kind === "fixed_hours" && scheme.value
      ? `${formatSchemeNumber(scheme.value)} hours`
      : "the weekdays in the month";
  const cap = scheme.maxCreditedDays
    ? `, at most ${formatSchemeNumber(scheme.maxCreditedDays)} days credited per month`
    : "";
  return `Monthly salary divided by ${divisor}${cap}`;
}

/** Rows a select offers: active ones, plus the current one when it is archived. */
export function selectableSchemes(schemes: readonly PayrollSchemeRow[] | undefined, currentKey?: string | null): PayrollSchemeRow[] {
  return [...(schemes ?? [])]
    .filter((scheme) => !scheme.archived || scheme.key === currentKey)
    .sort(bySortOrder);
}

export function getOptionLabel(options: readonly PayrollOptionRow[] | undefined, value?: string | null): string {
  if (!value) return "";
  return options?.find((option) => option.value === value)?.label ?? value;
}

export function getDefaultOption(options: readonly PayrollOptionRow[] | undefined): PayrollOptionRow | undefined {
  return options?.find((option) => option.isDefault);
}

/**
 * Choices for an option select: active rows, plus the current value when it is
 * archived or not in the list at all (older profiles), so saving never changes it.
 */
export function selectableOptions(
  options: readonly PayrollOptionRow[] | undefined,
  currentValue?: string | null,
): Array<{ value: string; label: string; archived: boolean }> {
  const rows = [...(options ?? [])]
    .filter((option) => !option.archived || option.value === currentValue)
    .sort(bySortOrder)
    .map((option) => ({ value: option.value, label: option.label, archived: option.archived }));
  if (currentValue && !rows.some((row) => row.value === currentValue)) {
    return [{ value: currentValue, label: currentValue, archived: false }, ...rows];
  }
  return rows;
}

export function inUseLabel(count?: number): string {
  if (count === undefined) return "";
  if (count === 0) return "Not in use";
  return `In use by ${count} employee${count === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Drafts for the options manager
// ---------------------------------------------------------------------------

export interface SchemeDraft {
  name: string;
  kind: string;
  value: string;
  maxCreditedDays: string;
}

export interface OptionDraft {
  label: string;
}

export const EMPTY_SCHEME_DRAFT: SchemeDraft = { name: "", kind: "fixed_days", value: "", maxCreditedDays: "" };

export function schemeToDraft(scheme: Pick<PayrollSchemeRow, "name" | "kind" | "value" | "maxCreditedDays">): SchemeDraft {
  return {
    name: scheme.name,
    kind: scheme.kind,
    value: scheme.value === null ? "" : String(scheme.value),
    maxCreditedDays: scheme.maxCreditedDays === null ? "" : String(scheme.maxCreditedDays),
  };
}

function checkName(value: string): string | undefined {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length < NAME_MIN_LENGTH || text.length > NAME_MAX_LENGTH ? NAME_LENGTH_MESSAGE : undefined;
}

function fixedValueMessage(kind: PayrollSchemeKind): string {
  return kind === "fixed_hours"
    ? `Enter the hours the monthly salary is divided by, from ${MIN_FIXED_HOURS} to ${MAX_FIXED_HOURS}.`
    : `Enter the days the monthly salary is divided by, from ${MIN_FIXED_DAYS} to ${MAX_FIXED_DAYS}.`;
}

export type SchemeDraftErrors = Partial<Record<keyof SchemeDraft, string>>;

export function validateSchemeDraft(draft: SchemeDraft): { valid: boolean; errors: SchemeDraftErrors } {
  const errors: SchemeDraftErrors = {};
  const nameError = checkName(draft.name);
  if (nameError) errors.name = nameError;
  if (!isSchemeKind(draft.kind)) {
    errors.kind = KIND_MESSAGE;
  } else if (draft.kind !== "weekdays") {
    const value = Number(draft.value);
    const [min, max] = draft.kind === "fixed_hours" ? [MIN_FIXED_HOURS, MAX_FIXED_HOURS] : [MIN_FIXED_DAYS, MAX_FIXED_DAYS];
    if (draft.value.trim() === "" || !Number.isFinite(value) || value < min || value > max) {
      errors.value = fixedValueMessage(draft.kind);
    }
  }
  if (draft.maxCreditedDays.trim() !== "") {
    const days = Number(draft.maxCreditedDays);
    if (!Number.isFinite(days) || days < MIN_CREDITED_DAYS || days > MAX_CREDITED_DAYS) {
      errors.maxCreditedDays = CREDITED_DAYS_MESSAGE;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Body for POST /payroll/schemes and PATCH /payroll/schemes/:id. */
export function toSchemePayload(draft: SchemeDraft): { name: string; kind: string; value: number | null; maxCreditedDays: number | null } {
  return {
    name: draft.name.trim().replace(/\s+/g, " "),
    kind: draft.kind,
    value: draft.kind === "weekdays" || draft.value.trim() === "" ? null : Number(draft.value),
    maxCreditedDays: draft.maxCreditedDays.trim() === "" ? null : Number(draft.maxCreditedDays),
  };
}

export function validateOptionDraft(draft: OptionDraft): { valid: boolean; errors: Partial<Record<keyof OptionDraft, string>> } {
  const labelError = checkName(draft.label);
  return { valid: !labelError, errors: labelError ? { label: labelError } : {} };
}

// ---------------------------------------------------------------------------
// Live rate preview (same math as getPayrollRateContext on the server)
// ---------------------------------------------------------------------------

export function weekdaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(year, month, day).getDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

export interface SchemeRates {
  dailyRate: number;
  hourlyRate: number;
  /** What the salary was divided by, e.g. "22 days" or "23 weekdays this month". */
  divisorLabel: string;
  /** Most regular hours paid in a whole month, or null without a cap. */
  monthlyCreditedHoursCap: number | null;
}

/**
 * Daily and hourly rate from a monthly salary under a scheme. fixed_days
 * divides by value days, fixed_hours by value hours, weekdays by the weekdays
 * of `referenceDate`'s month. Null without a salary above 0.
 */
export function computeSchemeRates(input: {
  baseSalary: number;
  scheme: Pick<PayrollSchemeRow, "kind" | "value" | "maxCreditedDays">;
  capHours: number;
  referenceDate: Date;
}): SchemeRates | null {
  const { baseSalary, scheme, referenceDate } = input;
  if (!Number.isFinite(baseSalary) || baseSalary <= 0) return null;
  const capHours = input.capHours > 0 ? input.capHours : 8;
  const monthlyCreditedHoursCap = scheme.maxCreditedDays ? Math.round(scheme.maxCreditedDays * capHours * 100) / 100 : null;
  if (scheme.kind === "fixed_hours" && scheme.value && scheme.value > 0) {
    const hourlyRate = baseSalary / scheme.value;
    return { hourlyRate, dailyRate: hourlyRate * capHours, divisorLabel: `${formatSchemeNumber(scheme.value)} hours`, monthlyCreditedHoursCap };
  }
  const fixedDays = scheme.kind === "fixed_days" && scheme.value && scheme.value > 0 ? scheme.value : null;
  const days = fixedDays ?? weekdaysInMonth(referenceDate);
  const dailyRate = baseSalary / days;
  return {
    dailyRate,
    hourlyRate: dailyRate / capHours,
    divisorLabel: fixedDays ? `${formatSchemeNumber(fixedDays)} days` : `${days} weekdays this month`,
    monthlyCreditedHoursCap,
  };
}
