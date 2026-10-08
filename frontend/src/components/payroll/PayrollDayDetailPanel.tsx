"use client";

import React from "react";
import { AlertTriangle, Clock3, Edit2, FilePlus2, Hourglass, PenLine, ShieldCheck, Timer, Trash2 } from "lucide-react";
import EventCard from "./EventCard";
import type { CalendarEvent } from "@/lib/payroll-calendar/types";
import {
  getEntryDurationMinutes,
  type PayrollAuditEntry,
  type PayrollDayAudit,
} from "@/lib/payroll-calendar/day-audit";
import type { OvertimeRequest } from "@/lib/overtime-requests";
import type { AdjustmentRequest } from "@/lib/adjustment-requests";
import { DEFAULT_BILLABLE_CAP_HOURS, PAYROLL_TIME_ZONE, claimedOvertimeHours } from "@/lib/time-requests";
import { CorrectionRequestItem, OvertimeRequestItem } from "./TimeRequestItems";

interface PayrollDayDetailPanelProps {
  selectedDate: string | null;
  audit: PayrollDayAudit | null;
  events: CalendarEvent[];
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  onRequestEditEntry: (entry: PayrollAuditEntry) => void;
  onRequestDeleteEntry: (entry: PayrollAuditEntry) => void;
  /** False for employees: entries are read-only and changes go through requests. */
  canEditEntries?: boolean;
  onRequestCorrection?: (entry: PayrollAuditEntry) => void;
  onReportMissingEntry?: (date: string) => void;
  /** Hours above the daily cap on the selected day (0 when none). */
  overtimeHours?: number;
  onRequestOvertime?: (date: string) => void;
  /** Daily billable cap of the person whose day this is. */
  capHours?: number;
  /** That person's overtime and correction requests for this day. */
  dayOvertimeRequests?: OvertimeRequest[];
  dayCorrectionRequests?: AdjustmentRequest[];
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

// Payroll days are Manila days; noon keeps a bare date on the same day in any zone.
function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00+08:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: PAYROLL_TIME_ZONE,
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PAYROLL_TIME_ZONE,
  });
}

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours > 0) return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
  return `${remainingMinutes}m`;
}

export default function PayrollDayDetailPanel({
  selectedDate,
  audit,
  events,
  onEditEvent,
  onDeleteEvent,
  onRequestEditEntry,
  onRequestDeleteEntry,
  canEditEntries = true,
  onRequestCorrection,
  onReportMissingEntry,
  overtimeHours = 0,
  onRequestOvertime,
  capHours = DEFAULT_BILLABLE_CAP_HOURS,
  dayOvertimeRequests = [],
  dayCorrectionRequests = [],
}: PayrollDayDetailPanelProps) {
  const eventsForDate = selectedDate
    ? events.filter((event) => event.start === selectedDate)
    : [];
  const needsReview = Boolean(audit?.warnings.length);

  if (!selectedDate || !audit) {
    return (
      <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
        <div className="text-sm font-semibold">Day Details</div>
        <div className="mt-3 rounded border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
          Select a date on the calendar to review work hours, payroll warnings, and events.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{formatDate(selectedDate)}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Payroll day review
          </div>
        </div>
        <span
          className={`rounded border px-2 py-1 text-xs font-medium ${
            needsReview
              ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          }`}
        >
          {needsReview ? "Needs Review" : "Clean"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-[var(--muted)]">
            <Timer className="h-3.5 w-3.5" />
            Total
          </div>
          <div className="mt-1 text-lg font-semibold">
            {formatMinutes(audit.totalMinutes)}
          </div>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-[var(--muted)]">
            <Clock3 className="h-3.5 w-3.5" />
            Entries
          </div>
          <div className="mt-1 text-lg font-semibold">{audit.entries.length}</div>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Status
          </div>
          <div className="mt-1 text-sm font-semibold">
            {audit.hasActiveEntry ? "Open" : "Closed"}
          </div>
        </div>
      </div>

      {audit.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {audit.warnings.map((warning) => (
            <div
              key={warning.code}
              className={`rounded border p-3 text-sm ${
                warning.severity === "danger"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    warning.severity === "danger" ? "text-red-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <div className="font-semibold">{warning.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {warning.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Billable / overtime split, the same for employees and reviewers. */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <div className="text-[10px] uppercase text-[var(--muted)]">Billable (cap {roundHours(capHours)} h)</div>
          <div className="mt-1 font-semibold">{formatMinutes(Math.min(audit.totalMinutes, capHours * 60))}</div>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <div className="text-[10px] uppercase text-[var(--muted)]">Overtime</div>
          <div className="mt-1 font-semibold">{roundHours(overtimeHours)} h</div>
        </div>
      </div>

      {(overtimeHours > 0 || dayOvertimeRequests.length > 0) && (
        <div className="mt-4 rounded border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {roundHours(overtimeHours)} hours above {canEditEntries ? "the" : "your"} daily cap
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">
                {dayOvertimeRequests.length === 0
                  ? "No overtime request for this day yet. Overtime is paid only after it is approved."
                  : "Overtime is paid only after it is approved."}
              </div>
              {dayOvertimeRequests.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {dayOvertimeRequests.map((request) => (
                    <OvertimeRequestItem key={request.id} request={request} showDay={false} />
                  ))}
                </ul>
              )}
              {!canEditEntries && !audit.hasActiveEntry && onRequestOvertime
                && overtimeHours - claimedOvertimeHours(dayOvertimeRequests) > 0.009 && (
                <button
                  type="button"
                  onClick={() => onRequestOvertime(selectedDate)}
                  className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {dayOvertimeRequests.length > 0 ? "Request the remaining overtime" : "Request overtime"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {dayCorrectionRequests.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">Correction requests</div>
          <ul className="space-y-2">
            {dayCorrectionRequests.map((request) => (
              <CorrectionRequestItem key={request.id} request={request} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">
            Time Entries
          </div>
          {!canEditEntries && onReportMissingEntry && (
            <button
              type="button"
              onClick={() => onReportMissingEntry(selectedDate)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded px-2 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] dark:text-sky-300"
            >
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
              Report a missing entry
            </button>
          )}
        </div>
        {audit.entries.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
            No time entries on this date.
          </div>
        ) : (
          <div className="space-y-2">
            {audit.entries.map((entry) => {
              const duration = getEntryDurationMinutes(entry);

              return (
                <div
                  key={entry.id}
                  className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {formatTime(entry.start)} to {entry.end ? formatTime(entry.end) : "Open"}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {formatMinutes(duration)}
                        {entry.notes ? ` / ${entry.notes}` : ""}
                      </div>
                    </div>
                    {!canEditEntries ? (
                      onRequestCorrection && (
                        <button
                          type="button"
                          onClick={() => onRequestCorrection(entry)}
                          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded px-2 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] dark:text-sky-300"
                        >
                          <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                          Request a correction
                        </button>
                      )
                    ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onRequestEditEntry(entry)}
                        className="rounded border border-transparent p-1.5 text-[var(--muted)] transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-600"
                        aria-label="Edit time entry"
                        title="Edit time entry"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteEntry(entry)}
                        className="rounded border border-transparent p-1.5 text-[var(--muted)] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600"
                        aria-label="Delete time entry"
                        title="Delete time entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
          Events
        </div>
        {eventsForDate.length > 0 ? (
          eventsForDate.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() => onEditEvent(event)}
              onDelete={() => onDeleteEvent(event)}
            />
          ))
        ) : (
          <div className="rounded border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
            No events on this date.
          </div>
        )}
      </div>
    </div>
  );
}
