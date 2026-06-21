import { TimeEntry } from "./types";

/**
 * Calculate total hours worked in a specific month
 */
export function calculateMonthlyHours(
  entries: TimeEntry[],
  month: number, // 0-indexed (0 = January)
  year: number
): number {
  return entries
    .filter((entry) => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getMonth() === month &&
        entryDate.getFullYear() === year &&
        entry.type === "work"
      );
    })
    .reduce((total, entry) => {
      if (entry.clockIn && entry.clockOut) {
        const clockIn = new Date(`${entry.date}T${entry.clockIn}`);
        const clockOut = new Date(`${entry.date}T${entry.clockOut}`);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);
}

/**
 * Calculate monthly salary from annual salary
 */
export function calculateMonthlySalary(annualSalary: number): number {
  return Math.round(annualSalary / 12);
}

/**
 * Format time from Date object to HH:MM string
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get number of work days in a month (Monday-Friday)
 */
export function getWorkDays(month: number, year: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }

  return workDays;
}

/**
 * Calculate hours per entry (if clock in/out exists)
 */
export function calculateEntryHours(entry: TimeEntry): number {
  if (entry.clockIn && entry.clockOut) {
    const clockIn = new Date(`${entry.date}T${entry.clockIn}`);
    const clockOut = new Date(`${entry.date}T${entry.clockOut}`);
    const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    return Math.max(0, hours); // Ensure non-negative
  }
  return 0;
}

/**
 * Format date to readable string (e.g., "Jan 15, 2024")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get month name from month index
 */
export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month] || "Unknown";
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get week number in year
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
