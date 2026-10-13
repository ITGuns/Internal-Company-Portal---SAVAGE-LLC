/**
 * Payroll dates shown in the payroll timezone (Asia/Manila), whatever the
 * viewer's browser timezone is. Mirrors backend payroll.calculations.ts.
 * No runtime imports so node --test can load this file directly.
 */

export const PAYROLL_DATE_TIME_ZONE = "Asia/Manila";

/** Which end of a payroll period a stored instant marks. */
export type PayrollDateEdge = "start" | "end";

export interface FormatPayrollDateOptions {
  /**
   * Set for period start, end and pay dates. Periods were stored at midnight
   * (start) or 23:59:59 (end, pay date) in different zones over time: UTC on
   * Vercel, Manila since 2026-10-09. Shifting half a day toward the middle of
   * the day reads both as the same calendar day.
   */
  edge?: PayrollDateEdge;
  format?: Intl.DateTimeFormatOptions;
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

/** Noon in Manila (04:00 UTC) of a YYYY-MM-DD day, so any formatter in that zone shows that day. */
function manilaNoon(dayKey: string): Date {
  return new Date(`${dayKey}T04:00:00Z`);
}

function toPayrollInstant(value: string | Date, edge?: PayrollDateEdge): Date | null {
  if (typeof value === "string" && DATE_ONLY.test(value)) return manilaNoon(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (!edge) return date;
  const shifted = date.getTime() + (edge === "start" ? HALF_DAY_MS : -HALF_DAY_MS);
  return manilaNoon(new Date(shifted).toISOString().slice(0, 10));
}

/**
 * Formats a payroll date in Asia/Manila. Date-only strings (YYYY-MM-DD) are
 * that calendar day. Returns `fallback` for a missing or invalid value.
 */
export function formatPayrollDate(
  value: string | Date | null | undefined,
  options: FormatPayrollDateOptions = {},
  fallback = "N/A",
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const instant = toPayrollInstant(value, options.edge);
  if (!instant) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    ...(options.format ?? DEFAULT_FORMAT),
    timeZone: PAYROLL_DATE_TIME_ZONE,
  }).format(instant);
}

/** Calendar day (YYYY-MM-DD) of a period edge, read the same way as formatPayrollDate. */
export function payrollPeriodDayKey(value: string | Date | null | undefined, edge: PayrollDateEdge): string | null {
  if (value === null || value === undefined || value === "") return null;
  const instant = toPayrollInstant(value, edge);
  if (!instant) return null;
  return instant.toISOString().slice(0, 10);
}

/**
 * First and last day (YYYY-MM-DD) of the semi-monthly period (1-15 or 16-end)
 * that contains `now` in Manila. Same split as the backend period scheduler.
 */
export function currentSemiMonthlyDayKeys(now: Date = new Date()): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_DATE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const [year, month, day] = [read("year"), read("month"), read("day")];
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const [first, last] = day <= 15 ? [1, 15] : [16, lastDay];
  return { start: `${year}-${pad(month)}-${pad(first)}`, end: `${year}-${pad(month)}-${pad(last)}` };
}

/** "Oct 1 to Oct 15, 2026" for a period whose edges may be day keys or stored instants. */
export function formatPayrollPeriod(start: string | Date | null | undefined, end: string | Date | null | undefined): string {
  const first = formatPayrollDate(start, { edge: "start", format: { month: "short", day: "numeric" } });
  const last = formatPayrollDate(end, { edge: "end" });
  return `${first} to ${last}`;
}
