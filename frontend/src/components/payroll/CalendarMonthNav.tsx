/**
 * Month navigation above the payroll calendar grid: the month title, then
 * previous, Today and next. CalendarTab drives FullCalendar through its API.
 */

import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface CalendarMonthNavProps {
  title: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  /** The grid already shows the current Manila month, so Today has nothing to do. */
  isCurrentMonth: boolean;
  /** A reload is running; the grid stays on screen meanwhile. */
  isRefreshing?: boolean;
}

const BUTTON_BASE =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] shadow-sm transition-[background-color,border-color,box-shadow] duration-150 hover:border-[var(--accent)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--border)] disabled:hover:shadow-sm";

export default function CalendarMonthNav({
  title,
  onPrev,
  onToday,
  onNext,
  isCurrentMonth,
  isRefreshing = false,
}: CalendarMonthNavProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 aria-live="polite" className="min-w-0 truncate text-base font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <div className="flex items-center gap-2">
        {isRefreshing && (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Updating
          </span>
        )}
        <button type="button" onClick={onPrev} aria-label="Previous month" className={`${BUTTON_BASE} w-10`}>
          <ChevronLeft className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentMonth}
          className={`${BUTTON_BASE} px-3 text-sm font-medium text-[var(--foreground)]`}
        >
          Today
        </button>
        <button type="button" onClick={onNext} aria-label="Next month" className={`${BUTTON_BASE} w-10`}>
          <ChevronRight className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
