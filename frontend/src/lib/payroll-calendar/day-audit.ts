export interface PayrollAuditEntry {
  id: string;
  userId?: string;
  start: string;
  end?: string;
  durationMin?: number;
  notes?: string;
}

export type PayrollDayWarningCode =
  | "missing_clock_out"
  | "overlapping_entries"
  | "long_shift"
  | "zero_duration";

export interface PayrollDayWarning {
  code: PayrollDayWarningCode;
  severity: "warning" | "danger";
  title: string;
  description: string;
}

interface PayrollDayAuditOptions {
  date: string;
  now?: string | Date;
}

export interface PayrollDayAudit {
  date: string;
  entries: PayrollAuditEntry[];
  totalMinutes: number;
  hasActiveEntry: boolean;
  warnings: PayrollDayWarning[];
}

const LONG_SHIFT_MINUTES = 12 * 60;

function getDateOnly(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getEntryDurationMinutes(entry: PayrollAuditEntry, now: Date = new Date()): number {
  if (entry.durationMin != null) {
    return Math.max(0, Math.round(entry.durationMin));
  }

  const start = new Date(entry.start);
  const end = entry.end ? new Date(entry.end) : now;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function getPayrollDayAudit(
  entries: PayrollAuditEntry[],
  options: PayrollDayAuditOptions,
): PayrollDayAudit {
  const now = options.now ? new Date(options.now) : new Date();
  const dayEntries = entries
    .filter((entry) => getDateOnly(entry.start) === options.date)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const totalMinutes = dayEntries.reduce(
    (sum, entry) => sum + getEntryDurationMinutes(entry, now),
    0,
  );
  const warnings: PayrollDayWarning[] = [];
  const hasActiveEntry = dayEntries.some((entry) => !entry.end);

  if (hasActiveEntry) {
    warnings.push({
      code: "missing_clock_out",
      severity: "warning",
      title: "Missing clock-out",
      description: "At least one entry is still open and will keep changing payroll totals.",
    });
  }

  const hasOverlap = dayEntries.some((entry, index) => {
    if (index === 0) return false;

    const previous = dayEntries[index - 1];
    const previousEnd = previous.end ? new Date(previous.end).getTime() : now.getTime();
    const start = new Date(entry.start).getTime();

    return Number.isFinite(previousEnd) && Number.isFinite(start) && start < previousEnd;
  });

  if (hasOverlap) {
    warnings.push({
      code: "overlapping_entries",
      severity: "danger",
      title: "Overlapping time entries",
      description: "Two or more entries overlap, which can inflate paid hours.",
    });
  }

  const hasLongShift = dayEntries.some((entry) => getEntryDurationMinutes(entry, now) > LONG_SHIFT_MINUTES)
    || totalMinutes > LONG_SHIFT_MINUTES;

  if (hasLongShift) {
    warnings.push({
      code: "long_shift",
      severity: "warning",
      title: "Unusually long shift",
      description: "This day is over 12 hours and should be reviewed before payroll.",
    });
  }

  const hasZeroDuration = dayEntries.some((entry) => Boolean(entry.end) && getEntryDurationMinutes(entry, now) === 0);

  if (hasZeroDuration) {
    warnings.push({
      code: "zero_duration",
      severity: "warning",
      title: "Zero-duration entry",
      description: "A completed entry has no recorded duration.",
    });
  }

  return {
    date: options.date,
    entries: dayEntries,
    totalMinutes,
    hasActiveEntry,
    warnings,
  };
}
