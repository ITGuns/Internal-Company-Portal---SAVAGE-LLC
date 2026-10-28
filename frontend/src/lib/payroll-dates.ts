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
 * Length of payroll periods, as the backend PAYROLL_PERIOD_CADENCE sets it:
 * monthly (1st to last day, the default) or semi_monthly (1-15 and 16-end).
 */
export type PayrollPeriodCadence = "monthly" | "semi_monthly";

/** Reads a cadence setting the way the backend does: semi_monthly when it says so, else monthly. */
export function parsePayrollPeriodCadence(value: string | null | undefined): PayrollPeriodCadence {
  return (value ?? "").trim().toLowerCase().replace(/-/g, "_") === "semi_monthly" ? "semi_monthly" : "monthly";
}

/** Year, month (1 to 12), day and length of the month of `now` in Manila. */
function manilaMonthParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_DATE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const [year, month, day] = [read("year"), read("month"), read("day")];
  return { year, month, day, lastDay: new Date(Date.UTC(year, month, 0)).getUTCDate() };
}

function monthDayKeys(year: number, month: number, first: number, last: number): { start: string; end: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return { start: `${year}-${pad(month)}-${pad(first)}`, end: `${year}-${pad(month)}-${pad(last)}` };
}

/**
 * First and last day (YYYY-MM-DD) of the semi-monthly period (1-15 or 16-end)
 * that contains `now` in Manila. Same split as the backend period scheduler.
 */
export function currentSemiMonthlyDayKeys(now: Date = new Date()): { start: string; end: string } {
  const { year, month, day, lastDay } = manilaMonthParts(now);
  return day <= 15 ? monthDayKeys(year, month, 1, 15) : monthDayKeys(year, month, 16, lastDay);
}

/** First and last day (YYYY-MM-DD) of the calendar month that contains `now` in Manila. */
export function currentMonthlyDayKeys(now: Date = new Date()): { start: string; end: string } {
  const { year, month, lastDay } = manilaMonthParts(now);
  return monthDayKeys(year, month, 1, lastDay);
}

/** The period that contains `now` for a cadence, the same days the backend creates. */
export function currentPeriodDayKeys(cadence: PayrollPeriodCadence, now: Date = new Date()): { start: string; end: string } {
  return cadence === "semi_monthly" ? currentSemiMonthlyDayKeys(now) : currentMonthlyDayKeys(now);
}

/** "Oct 1 to Oct 15, 2026" for a period whose edges may be day keys or stored instants. */
export function formatPayrollPeriod(start: string | Date | null | undefined, end: string | Date | null | undefined): string {
  const first = formatPayrollDate(start, { edge: "start", format: { month: "short", day: "numeric" } });
  const last = formatPayrollDate(end, { edge: "end" });
  return `${first} to ${last}`;
}

// ---------------------------------------------------------------------------
// Manila day keys, instants and times for the payroll calendar (2026-10-28).
// The server buckets time entries by the Manila day of their start
// (payrollDayKey in backend payroll.calculations.ts); every day key, "today",
// month and range on the payroll page goes through these, never through the
// viewer's browser zone.
// ---------------------------------------------------------------------------

const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_DATE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: PAYROLL_DATE_TIME_ZONE,
});

const pad2 = (value: number) => String(value).padStart(2, "0");

function zonedParts(instant: Date) {
  const parts = zonedFormatter.formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

function toValidInstant(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Year, month (1 to 12) and day of a real YYYY-MM-DD calendar day, else null. */
function parseDayKey(value: string): { year: number; month: number; day: number } | null {
  if (!DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { year, month, day };
}

/** Milliseconds the payroll zone is ahead of UTC at an instant (8 hours for Manila). */
function zoneOffsetMs(instant: Date): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Manila calendar day (YYYY-MM-DD) of an instant. A date-only string is
 * already a day and comes back as it is. Null for a missing or invalid value.
 */
export function manilaDayKey(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && DATE_ONLY.test(value)) return parseDayKey(value) ? value : null;
  const instant = toValidInstant(value);
  if (!instant) return null;
  const { year, month, day } = zonedParts(instant);
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

/** Today's day key in Manila. */
export function manilaTodayKey(now: Date = new Date()): string {
  return manilaDayKey(now) ?? "";
}

/**
 * ISO instant of a Manila wall-clock time ("HH:mm" or "HH:mm:ss") on a day:
 * manilaInstant("2026-10-28", "09:00") is "2026-10-28T01:00:00.000Z".
 * Null for an invalid day or time.
 */
export function manilaInstant(dayKey: string, time: string): string | null {
  const day = parseDayKey(dayKey);
  const clock = TIME_OF_DAY.exec(time);
  if (!day || !clock) return null;
  const naive = Date.UTC(day.year, day.month - 1, day.day, Number(clock[1]), Number(clock[2]), Number(clock[3] ?? 0));
  const guess = naive - zoneOffsetMs(new Date(naive));
  // Second pass corrects an offset change between the guess and the wall time (Manila has had none since 1978).
  return new Date(naive - zoneOffsetMs(new Date(guess))).toISOString();
}

/**
 * First and last millisecond of a Manila day as ISO instants, for the
 * inclusive start/end filter of GET /payroll/time-entries (gte / lte).
 */
export function manilaDayBounds(dayKey: string): { startIso: string; endIso: string } | null {
  const day = parseDayKey(dayKey);
  const startIso = day ? manilaInstant(dayKey, "00:00") : null;
  if (!day || !startIso) return null;
  const nextDay = new Date(Date.UTC(day.year, day.month - 1, day.day + 1)).toISOString().slice(0, 10);
  const nextStart = manilaInstant(nextDay, "00:00");
  return nextStart ? { startIso, endIso: new Date(Date.parse(nextStart) - 1).toISOString() } : null;
}

/** "HH:mm" (24 hour) of an instant in Manila, for time inputs. Null when invalid. */
export function manilaTimeInput(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const instant = toValidInstant(value);
  if (!instant) return null;
  const { hour, minute } = zonedParts(instant);
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** Clock time of an instant in Manila for display, e.g. "09:05 AM". */
export function formatPayrollTime(value: string | Date | null | undefined, fallback = ""): string {
  if (value === null || value === undefined || value === "") return fallback;
  const instant = toValidInstant(value);
  return instant ? clockFormatter.format(instant) : fallback;
}

/** First and last day (YYYY-MM-DD) of a calendar month, month 1 to 12. */
export function monthDayKeysFor(year: number, month: number): { start: string; end: string } {
  return monthDayKeys(year, month, 1, new Date(Date.UTC(year, month, 0)).getUTCDate());
}

/** The calendar month `delta` months away from year / month (month 1 to 12). */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}
