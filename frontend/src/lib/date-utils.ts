/**
 * Date Utility Functions
 * 
 * Centralized date formatting and manipulation utilities
 * to eliminate repeated date logic across the application.
 */

/**
 * Get today's date in YYYY-MM-DD format
 * Replaces: new Date().toISOString().slice(0, 10)
 */
export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Convert a Date to YYYY-MM-DD format
 * @param date - Date object or date string
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/**
 * Format date for display (e.g., "Jan 15, 2026")
 * @param date - Date object, ISO string, or YYYY-MM-DD string
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options);
}

/**
 * Format date and time for display (e.g., "Jan 15, 2026 at 3:45 PM")
 * @param date - Date object or ISO string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format time only (e.g., "3:45 PM")
 * @param date - Date object or ISO string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date as "Today", "Yesterday", or formatted date
 * @param date - Date object, ISO string, or YYYY-MM-DD string
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = getTodayString();
  const dateStr = toDateString(d);

  if (dateStr === today) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === toDateString(yesterday)) {
    return 'Yesterday';
  }

  return formatDate(d);
}

/**
 * Check if a date is in the past
 * @param date - Date object or date string
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Check if a date is in the future
 * @param date - Date object or date string
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Check if a date is today
 * @param date - Date object or date string
 */
export function isToday(date: Date | string): boolean {
  return toDateString(date) === getTodayString();
}

/**
 * Get start of week (Sunday) for a given date
 * @param date - Date object or date string
 */
export function getStartOfWeek(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

/**
 * Get end of week (Saturday) for a given date
 * @param date - Date object or date string
 */
export function getEndOfWeek(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  return new Date(d.setDate(diff));
}

/**
 * Check if a date is within this week
 * @param date - Date object or date string
 */
export function isThisWeek(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = getStartOfWeek();
  const end = getEndOfWeek();
  return d >= start && d <= end;
}

/**
 * Calculate days between two dates
 * @param date1 - First date
 * @param date2 - Second date
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 * @param date - Date to add to
 * @param days - Number of days to add (can be negative)
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
