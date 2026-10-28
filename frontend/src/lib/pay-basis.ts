/**
 * Pure helpers for EmployeeProfile pay basis settings.
 * No runtime imports so node --test can load this file directly.
 */

export type PayBasis = "hourly_from_monthly" | "fixed_monthly" | "hourly_rate";

export const DEFAULT_PAY_BASIS: PayBasis = "hourly_from_monthly";
export const DEFAULT_OVERTIME_MULTIPLIER = 1.25;

export const PAY_BASIS_OPTIONS: Array<{ value: PayBasis; label: string; help: string }> = [
  {
    value: "hourly_from_monthly",
    label: "Hourly from monthly salary",
    help: "Pays billable hours at a rate worked out from the monthly salary.",
  },
  {
    value: "fixed_monthly",
    label: "Fixed monthly salary",
    help: "Pays the salary for the period no matter the hours logged.",
  },
  {
    value: "hourly_rate",
    label: "Hourly rate",
    help: "Pays billable hours at a set hourly rate. Monthly salary is not used.",
  },
];

export function isPayBasis(value: unknown): value is PayBasis {
  return value === "hourly_from_monthly" || value === "fixed_monthly" || value === "hourly_rate";
}

export function getPayBasisLabel(value?: string | null): string {
  return PAY_BASIS_OPTIONS.find((option) => option.value === value)?.label
    ?? PAY_BASIS_OPTIONS[0].label;
}

export interface PayBasisConfigInput {
  payBasis: string;
  baseSalary: string;
  hourlyRate: string;
  overtimeMultiplier: string;
}

export function validatePayBasisConfig(input: PayBasisConfigInput): {
  valid: boolean;
  errors: Partial<Record<keyof PayBasisConfigInput, string>>;
} {
  const errors: Partial<Record<keyof PayBasisConfigInput, string>> = {};

  if (!isPayBasis(input.payBasis)) {
    errors.payBasis = "Choose a pay basis.";
  }

  if (input.payBasis === "hourly_rate") {
    const rate = Number(input.hourlyRate);
    if (input.hourlyRate.trim() === "" || !Number.isFinite(rate) || rate <= 0) {
      errors.hourlyRate = "Set an hourly rate above 0.";
    }
  } else {
    const salary = Number(input.baseSalary);
    if (input.baseSalary.trim() === "" || !Number.isFinite(salary) || salary <= 0) {
      errors.baseSalary = "Enter a monthly salary above zero.";
    }
  }

  const multiplier = Number(input.overtimeMultiplier);
  if (input.overtimeMultiplier.trim() === "" || !Number.isFinite(multiplier)) {
    errors.overtimeMultiplier = "Enter an overtime multiplier.";
  } else if (multiplier < 1 || multiplier > 5) {
    errors.overtimeMultiplier = "Use a multiplier between 1 and 5.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Hourly rate used for overtime and hourly pay under the chosen basis. */
export function getEffectiveHourlyRate(
  payBasis: string,
  hourlyRate: number,
  derivedHourlyRate: number,
): number {
  if (payBasis === "hourly_rate") return Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 0;
  return Number.isFinite(derivedHourlyRate) && derivedHourlyRate > 0 ? derivedHourlyRate : 0;
}

/** Same default as DEFAULT_MAX_BILLABLE_HOURS_PER_DAY in backend payroll.calculations.ts. */
const DEFAULT_DAILY_CAP_HOURS = 8;

export interface CalendarPayHeaderInput {
  payBasis?: string | null;
  baseSalary?: number | null;
  hourlyRate?: number | null;
  maxBillableHoursPerDay?: number | null;
  /** Name of the employee's salary divisor scheme (managed list), when known. */
  schemeName?: string | null;
  /** The scheme's cap on credited days per month, when it has one. */
  maxCreditedDays?: number | null;
  /** Logged hours per payroll day of the month shown. */
  dailyHours: readonly number[];
}

export interface CalendarPayHeader {
  /** Money shown next to the logged hours, or null when there is none to show. */
  amount: number | null;
  /** What the amount is, in plain words. */
  label: string;
}

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDays(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Pay figure for the time tracking calendar header. A fixed monthly salary is
 * paid as is, so it shows only its own label. hourly_from_monthly shows the
 * monthly base salary with the scheme name and its credited-days cap when
 * known. hourly_rate never shows the salary: it shows each day's logged hours
 * up to the daily cap (and the month up to the credited-days cap) times the
 * hourly rate, without overtime.
 */
export function getCalendarPayHeader(input: CalendarPayHeaderInput): CalendarPayHeader {
  const payBasis = isPayBasis(input.payBasis) ? input.payBasis : DEFAULT_PAY_BASIS;
  const creditedDays = (input.maxCreditedDays ?? 0) > 0 ? (input.maxCreditedDays as number) : null;
  if (payBasis === "fixed_monthly") {
    return { amount: input.baseSalary ?? 0, label: getPayBasisLabel(payBasis) };
  }
  if (payBasis !== "hourly_rate") {
    const parts = ["Monthly base salary"];
    if (input.schemeName) parts.push(input.schemeName);
    if (creditedDays) parts.push(`at most ${formatDays(creditedDays)} days credited a month`);
    return { amount: input.baseSalary ?? 0, label: parts.join(" · ") };
  }

  const rate = input.hourlyRate ?? 0;
  if (!(rate > 0)) return { amount: null, label: "Paid by the hour" };

  const cap = (input.maxBillableHoursPerDay ?? 0) > 0
    ? (input.maxBillableHoursPerDay as number)
    : DEFAULT_DAILY_CAP_HOURS;
  const billableHours = input.dailyHours.reduce((sum, hours) => sum + Math.min(Math.max(hours, 0), cap), 0);
  const creditedHours = creditedDays ? Math.min(billableHours, creditedDays * cap) : billableHours;
  // On an hourly rate the scheme matters only through its cap, so it is named only then.
  const label = creditedDays
    ? [formatPeso(rate) + " per hour", input.schemeName, `up to ${cap} h a day and ${formatDays(creditedDays)} credited days a month, overtime not included`]
      .filter(Boolean)
      .join(" · ")
    : `${formatPeso(rate)} per hour, up to ${cap} h a day, overtime not included`;
  return { amount: creditedHours * rate, label };
}
