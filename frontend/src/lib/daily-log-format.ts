export type DailyLogTaskStatus = 'completed' | 'review' | 'in_progress' | 'in-progress' | 'blocked' | 'todo';
export type DerivedDailyLogStatus = 'completed' | 'review' | 'in-progress' | 'blocked';

export interface DailyLogStatusTask {
  completed?: boolean;
  status?: string | null;
}

function padClockPart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatWholeMinutesAsClock(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${padClockPart(hours)}:${padClockPart(minutes)}`;
}

function isValidDailyHours(hours: number, minutes: number): boolean {
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
  if (hours < 0 || minutes < 0 || minutes > 59) return false;
  if (hours > 24) return false;
  return hours < 24 || minutes === 0;
}

export function formatDecimalHoursAsClock(hours?: number | null): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '';
  return formatWholeMinutesAsClock(hours * 60);
}

export function getLocalTodayDateInput(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    padClockPart(today.getMonth() + 1),
    padClockPart(today.getDate()),
  ].join('-');
}

export function normalizeHoursClockInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const decimalMatch = /^(\d{1,2})(?:\.(\d+))?$/.exec(trimmed);
  if (decimalMatch) {
    const decimalHours = Number(trimmed);
    if (!Number.isFinite(decimalHours) || decimalHours < 0 || decimalHours > 24) return null;
    return formatDecimalHoursAsClock(decimalHours);
  }

  const clockMatch = /^(\d{1,2})(?::(\d{0,2}))$/.exec(trimmed);
  if (!clockMatch) return null;

  const hours = Number(clockMatch[1]);
  const minutesText = clockMatch[2] || '0';
  const minutes = Number(minutesText.padStart(2, '0'));
  if (!isValidDailyHours(hours, minutes)) return null;

  return `${padClockPart(hours)}:${padClockPart(minutes)}`;
}

export function parseHoursClockToDecimal(value: string): number | null {
  const normalized = normalizeHoursClockInput(value);
  if (normalized === null || normalized === '') return null;

  const [hoursText, minutesText] = normalized.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!isValidDailyHours(hours, minutes)) return null;

  return hours + minutes / 60;
}

export function normalizeLogTaskStatus(task: DailyLogStatusTask): DerivedDailyLogStatus {
  const rawStatus = String(task.status || '').trim().toLowerCase().replace(/_/g, '-');

  if (rawStatus === 'blocked') return 'blocked';
  if (rawStatus === 'completed' || task.completed === true) return 'completed';
  if (rawStatus === 'review') return 'review';

  return 'in-progress';
}

export function deriveDailyLogStatusFromTasks(tasks: DailyLogStatusTask[]): DerivedDailyLogStatus {
  if (tasks.length === 0) return 'in-progress';

  const statuses = tasks.map(normalizeLogTaskStatus);
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.every((status) => status === 'completed')) return 'completed';
  if (statuses.includes('in-progress')) return 'in-progress';
  if (statuses.includes('review')) return 'review';

  return 'in-progress';
}
