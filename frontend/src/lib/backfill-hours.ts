/**
 * Backfill hours form helpers (POST /payroll/entries/backfill, payroll roles
 * only). Mirrors backend/src/payroll/backfill.calculations.ts. No runtime
 * imports so node --test can load this file directly.
 */

/** The end date may be at most this many days after the start date. */
export const MAX_BACKFILL_SPAN_DAYS = 62;
export const MAX_BACKFILL_NOTE_LENGTH = 500;
/** Deskii went into use in October 2026; backfill covers the days before that. */
export const BACKFILL_DEFAULT_START = "2026-10-01";

export interface BackfillForm {
  userId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  skipWeekends: boolean;
  notes: string;
}

export type BackfillFormErrors = Partial<Record<keyof BackfillForm, string>>;

export interface BackfillResult {
  /** Entries written; 0 on a preview. */
  created: number;
  /** "YYYY-MM-DD: weekend" or "YYYY-MM-DD: existing entry". */
  skipped: string[];
  /** Days that get (or would get) an entry. */
  days: string[];
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isRealDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function clockMinutes(value: string): number | null {
  const match = CLOCK_PATTERN.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * Length of one day's entry in minutes. An end time earlier than the start
 * ends on the next day; equal or invalid times give null (the form refuses
 * them), so an entry is always shorter than 24 hours.
 */
export function backfillWindowMinutes(startTime: string, endTime: string): number | null {
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);
  if (start === null || end === null || start === end) return null;
  return end > start ? end - start : 24 * 60 - start + end;
}

export function addDaysToKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Calendar day (YYYY-MM-DD) of `now` in the payroll time zone. */
export function payrollTodayKey(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

/** October 1 (or the earliest allowed day) to yesterday, 09:00 to 17:00 (eight hours, the daily cap), weekends skipped. */
export function getBackfillDefaults(todayKey: string, userId = ""): BackfillForm {
  const yesterday = addDaysToKey(todayKey, -1);
  const earliest = addDaysToKey(yesterday, -MAX_BACKFILL_SPAN_DAYS);
  const start = BACKFILL_DEFAULT_START > earliest ? BACKFILL_DEFAULT_START : earliest;
  return {
    userId,
    startDate: start < yesterday ? start : yesterday,
    endDate: yesterday,
    startTime: "09:00",
    endTime: "17:00",
    skipWeekends: true,
    notes: "",
  };
}

export function validateBackfillForm(form: BackfillForm, todayKey: string): BackfillFormErrors {
  const errors: BackfillFormErrors = {};

  if (!form.userId) errors.userId = "Choose an employee.";

  const startOk = isRealDate(form.startDate);
  const endOk = isRealDate(form.endDate);
  if (!startOk) errors.startDate = "Enter a valid start date.";
  if (!endOk) errors.endDate = "Enter a valid end date.";
  if (startOk && endOk) {
    if (form.endDate > todayKey) errors.endDate = "The end date cannot be in the future.";
    else if (form.endDate < form.startDate) errors.endDate = "The end date must be on or after the start date.";
    else if (form.endDate > addDaysToKey(form.startDate, MAX_BACKFILL_SPAN_DAYS)) {
      errors.endDate = `The end date can be at most ${MAX_BACKFILL_SPAN_DAYS} days after the start date.`;
    }
  }

  const start = clockMinutes(form.startTime);
  const end = clockMinutes(form.endTime);
  if (start === null) errors.startTime = "Enter a start time.";
  if (end === null) errors.endTime = "Enter an end time.";
  if (start !== null && end !== null && end === start) errors.endTime = "The end time cannot be the same as the start time.";

  if (form.notes.trim().length > MAX_BACKFILL_NOTE_LENGTH) {
    errors.notes = `Notes can be at most ${MAX_BACKFILL_NOTE_LENGTH} characters.`;
  }
  return errors;
}

export function buildBackfillPayload(form: BackfillForm, dryRun: boolean) {
  const notes = form.notes.trim();
  return {
    userId: form.userId,
    startDate: form.startDate,
    endDate: form.endDate,
    startTime: form.startTime,
    endTime: form.endTime,
    skipWeekends: form.skipWeekends,
    ...(notes ? { notes } : {}),
    dryRun,
  };
}

export function countSkipped(skipped: readonly string[]): { weekends: number; existing: number } {
  let weekends = 0;
  let existing = 0;
  for (const item of skipped) {
    if (item.endsWith(": weekend")) weekends += 1;
    else if (item.endsWith(": existing entry")) existing += 1;
  }
  return { weekends, existing };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "8 h each" or, when the end time is earlier than the start, "8 h each, ending the next day". */
function entryLengthText(times: Pick<BackfillForm, "startTime" | "endTime">): string | null {
  const minutes = backfillWindowMinutes(times.startTime, times.endTime);
  if (minutes === null) return null;
  const overnight = times.endTime < times.startTime ? ", ending the next day" : "";
  return `${Number((minutes / 60).toFixed(2))} h each${overnight}`;
}

/**
 * "9 days will be created, 4 skipped (weekends 4, existing 0)." With the form
 * times: "9 days will be created (8 h each), 4 skipped (weekends 4, existing 0)."
 */
export function backfillPreviewMessage(
  result: BackfillResult,
  times?: Pick<BackfillForm, "startTime" | "endTime">,
): string {
  const { weekends, existing } = countSkipped(result.skipped);
  const length = times ? entryLengthText(times) : null;
  const created = `${plural(result.days.length, "day", "days")} will be created${length ? ` (${length})` : ""}`;
  return `${created}, ${result.skipped.length} skipped (weekends ${weekends}, existing ${existing}).`;
}
