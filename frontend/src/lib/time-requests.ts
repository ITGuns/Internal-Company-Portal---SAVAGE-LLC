/**
 * Pure helpers for overtime and time-entry correction requests.
 * No runtime imports so node --test can load this file directly.
 */

export type TimeRequestStatus = "pending" | "approved" | "rejected";
export type AdjustmentAction = "create" | "update" | "delete";

export const TIME_REQUEST_STATUSES: TimeRequestStatus[] = ["pending", "approved", "rejected"];

export const TIME_REQUEST_STATUS_LABELS: Record<TimeRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const ADJUSTMENT_ACTION_LABELS: Record<AdjustmentAction, string> = {
  create: "Add a missing entry",
  update: "Change times",
  delete: "Remove entry",
};

export const DEFAULT_BILLABLE_CAP_HOURS = 8;
// Same limits as backend/src/payroll/time-requests.service.ts.
export const MAX_REASON_LENGTH = 500;
export const MAX_ADJUSTMENT_SPAN_HOURS = 24;
export const MAX_ADJUSTMENT_LOOKBACK_DAYS = 60;
/** Payroll days are calendar days in this zone (backend PAYROLL_TIMEZONE default). */
export const PAYROLL_TIME_ZONE = "Asia/Manila";

const HOUR_MS = 60 * 60 * 1000;

export interface OvertimeRequestForm {
  workDate: string;
  hours: string;
  reason: string;
}

export interface AdjustmentRequestForm {
  action: AdjustmentAction;
  timeEntryId?: string;
  proposedStart: string;
  proposedEnd: string;
  reason: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: Partial<Record<keyof T, string>>;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calendar day (YYYY-MM-DD) of an instant in the payroll zone, or null for an invalid instant. */
export function getPayrollDayKey(instant: string | Date, timeZone: string = PAYROLL_TIME_ZONE): string | null {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

/**
 * Tracked minutes for one payroll day, bucketed by entry start like the server
 * does. Open entries (no end yet) are skipped because the server only counts
 * finished ones.
 */
export function getPayrollDayMinutes(
  entries: Array<{ start: string; end?: string | null; durationMin?: number | null }>,
  dateKey: string,
  timeZone: string = PAYROLL_TIME_ZONE,
): number {
  return entries.reduce((sum, entry) => {
    if (getPayrollDayKey(entry.start, timeZone) !== dateKey) return sum;
    if (entry.durationMin != null) return sum + Math.max(0, entry.durationMin);
    if (!entry.end) return sum;
    const minutes = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 60000;
    return Number.isFinite(minutes) ? sum + Math.max(0, minutes) : sum;
  }, 0);
}

/**
 * Hours above the billable cap for a day, rounded to 2 decimals.
 * This is the most overtime a person can request for that day.
 */
export function getOvertimeHoursForDay(totalMinutes: number, capHours: number): number {
  const cap = Number.isFinite(capHours) && capHours > 0 ? capHours : DEFAULT_BILLABLE_CAP_HOURS;
  const worked = Math.max(0, Number(totalMinutes) || 0) / 60;
  return roundHours(Math.max(0, worked - cap));
}

export function validateOvertimeRequestForm(
  form: OvertimeRequestForm,
  options: { maxHours: number; today?: string },
): ValidationResult<OvertimeRequestForm> {
  const errors: Partial<Record<keyof OvertimeRequestForm, string>> = {};
  const hours = Number(form.hours);
  const maxHours = roundHours(Math.max(0, options.maxHours || 0));

  if (!DATE_ONLY.test(form.workDate)) {
    errors.workDate = "Choose the day you worked overtime.";
  } else if (options.today && form.workDate > options.today) {
    errors.workDate = "You can only request overtime for a day that has started.";
  }

  if (form.hours.trim() === "" || !Number.isFinite(hours)) {
    errors.hours = "Enter the overtime hours.";
  } else if (hours <= 0) {
    errors.hours = "Hours must be more than zero.";
  } else if (maxHours <= 0) {
    errors.hours = "This day has no hours above your daily cap.";
  } else if (hours > maxHours) {
    errors.hours = `You can request up to ${maxHours} h for this day.`;
  }

  if (form.reason.length > MAX_REASON_LENGTH) {
    errors.reason = `Keep the reason under ${MAX_REASON_LENGTH} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAdjustmentRequestForm(
  form: AdjustmentRequestForm,
  options: { now?: Date } = {},
): ValidationResult<AdjustmentRequestForm> {
  const errors: Partial<Record<keyof AdjustmentRequestForm, string>> = {};
  const reason = form.reason.trim();

  if ((form.action === "update" || form.action === "delete") && !form.timeEntryId) {
    errors.timeEntryId = "Pick the entry you want corrected.";
  }

  if (form.action !== "delete") {
    const start = new Date(form.proposedStart);
    const end = form.proposedEnd ? new Date(form.proposedEnd) : null;

    if (!form.proposedStart || Number.isNaN(start.getTime())) {
      errors.proposedStart = "Enter the correct start time.";
    }
    if (form.action === "create" && !form.proposedEnd) {
      errors.proposedEnd = "Enter the correct end time.";
    } else if (end && Number.isNaN(end.getTime())) {
      errors.proposedEnd = "Enter a valid end time.";
    } else if (end && !errors.proposedStart && end.getTime() <= start.getTime()) {
      errors.proposedEnd = "End time must be after the start time.";
    }
    const now = options.now ?? new Date();
    const earliest = now.getTime() - MAX_ADJUSTMENT_LOOKBACK_DAYS * 24 * HOUR_MS;
    if (!errors.proposedStart && start.getTime() > now.getTime()) {
      errors.proposedStart = "Start time cannot be in the future.";
    } else if (!errors.proposedStart && start.getTime() < earliest) {
      errors.proposedStart = `Corrections can only go back ${MAX_ADJUSTMENT_LOOKBACK_DAYS} days.`;
    }
    if (!errors.proposedEnd && end && end.getTime() > now.getTime()) {
      errors.proposedEnd = "End time cannot be in the future.";
    } else if (
      !errors.proposedEnd &&
      !errors.proposedStart &&
      end &&
      end.getTime() - start.getTime() > MAX_ADJUSTMENT_SPAN_HOURS * HOUR_MS
    ) {
      errors.proposedEnd = `An entry can be at most ${MAX_ADJUSTMENT_SPAN_HOURS} hours long.`;
    }
  }

  if (!reason) {
    errors.reason = "Explain what needs to change.";
  } else if (reason.length > MAX_REASON_LENGTH) {
    errors.reason = `Keep the reason under ${MAX_REASON_LENGTH} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Converts a datetime-local value (YYYY-MM-DDTHH:mm, local time) to an ISO string.
 * Returns undefined for blank or invalid input.
 */
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Formats an ISO instant for a datetime-local input in the browser's zone. */
export function isoToLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface TimeRequestFilter {
  status?: TimeRequestStatus | "all";
  userId?: string;
}

export function filterTimeRequests<T extends { status: string; userId: string }>(
  requests: T[],
  filter: TimeRequestFilter,
): T[] {
  return requests.filter((request) => {
    if (filter.status && filter.status !== "all" && request.status !== filter.status) return false;
    if (filter.userId && request.userId !== filter.userId) return false;
    return true;
  });
}

export function countPending(requests: Array<{ status: string }>): number {
  return requests.filter((request) => request.status === "pending").length;
}

/**
 * Approved hours may only be overridden downward. Blank means "approve as requested".
 */
export function validateApprovedHours(
  value: string,
  requestedHours: number,
): { valid: boolean; hours?: number; error?: string } {
  if (value.trim() === "") return { valid: true };
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) {
    return { valid: false, error: "Approved hours must be more than zero." };
  }
  if (hours > requestedHours) {
    return { valid: false, error: `Approved hours cannot exceed the ${requestedHours} hours requested.` };
  }
  return { valid: true, hours: roundHours(hours) };
}

function formatHours(value: number): string {
  return `${roundHours(value)} h`;
}

/**
 * Hours line for an overtime request. `hours` is always the original ask;
 * approvedHours is set when a reviewer approved it (possibly fewer hours).
 */
export function describeOvertimeHours(request: { status: string; hours: number; approvedHours?: number | null }): string {
  const approved = request.approvedHours;
  if (request.status === "approved" && typeof approved === "number" && Math.abs(approved - request.hours) > 1e-6) {
    return `asked ${formatHours(request.hours)}, approved ${formatHours(approved)}`;
  }
  if (request.status === "approved") return `${formatHours(request.hours)} approved`;
  return `${formatHours(request.hours)} asked`;
}

/** Hours of an approved request that count toward pay (approvedHours, else the ask). */
export function paidRequestHours(request: { status: string; hours: number; approvedHours?: number | null }): number {
  if (request.status !== "approved") return 0;
  return request.approvedHours ?? request.hours;
}

/** True when the signed-in user filed this request (they cannot review it). */
export function isOwnRequest(request: { userId: string }, currentUserId?: string | number | null): boolean {
  return currentUserId !== undefined && currentUserId !== null && String(currentUserId) === String(request.userId);
}

export interface CorrectionTimes {
  start?: string | null;
  end?: string | null;
}

/**
 * Old and new times of a correction. Before approval "old" is the entry as it
 * is now; after approval it is the copy taken when the change was applied.
 */
export function correctionTimes(request: {
  status: string;
  action: string;
  proposedStart?: string | null;
  proposedEnd?: string | null;
  previousStart?: string | null;
  previousEnd?: string | null;
  timeEntry?: { start: string; end?: string | null } | null;
}): { before: CorrectionTimes | null; after: CorrectionTimes | null } {
  const reviewed = request.status === "approved";
  const beforeStart = reviewed ? request.previousStart : request.timeEntry?.start;
  const beforeEnd = reviewed ? request.previousEnd : request.timeEntry?.end;
  const before = request.action === "create" || !beforeStart ? null : { start: beforeStart, end: beforeEnd ?? null };
  if (request.action === "delete") return { before, after: null };
  return {
    before,
    after: {
      start: request.proposedStart ?? before?.start ?? null,
      end: request.proposedEnd ?? before?.end ?? null,
    },
  };
}

/** Hours a request holds against its day: the ask while pending, the approved hours once approved. */
export function claimedOvertimeHours(
  requests: Array<{ status: string; hours: number; approvedHours?: number | null }>,
): number {
  return roundHours(requests.reduce((sum, request) => {
    if (request.status === "pending") return sum + request.hours;
    if (request.status === "approved") return sum + (request.approvedHours ?? request.hours);
    return sum;
  }, 0));
}

/** Payroll day a correction is about: its proposed start, else the entry's old or current start. */
export function correctionDayKey(request: {
  proposedStart?: string | null;
  previousStart?: string | null;
  timeEntry?: { start: string } | null;
}): string | null {
  const instant = request.proposedStart ?? request.previousStart ?? request.timeEntry?.start;
  return instant ? getPayrollDayKey(instant) : null;
}

/** The overtime and correction requests that belong to one payroll day. */
export function requestsForDay<
  O extends { workDate: string },
  C extends { proposedStart?: string | null; previousStart?: string | null; timeEntry?: { start: string } | null },
>(overtime: O[], corrections: C[], dayKey: string): { overtime: O[]; corrections: C[] } {
  return {
    overtime: overtime.filter((request) => getPayrollDayKey(request.workDate) === dayKey),
    corrections: corrections.filter((request) => correctionDayKey(request) === dayKey),
  };
}
