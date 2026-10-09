"use client";

import React from "react";
import { AlertTriangle, Clock3, Edit2, ShieldCheck, Timer, Trash2 } from "lucide-react";
import EventCard from "./EventCard";
import type { CalendarEvent } from "@/lib/payroll-calendar/types";
import {
  getEntryDurationMinutes,
  type PayrollAuditEntry,
  type PayrollDayAudit,
} from "@/lib/payroll-calendar/day-audit";

interface PayrollDayDetailPanelProps {
  selectedDate: string | null;
  audit: PayrollDayAudit | null;
  events: CalendarEvent[];
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  onRequestEditEntry: (entry: PayrollAuditEntry) => void;
  onRequestDeleteEntry: (entry: PayrollAuditEntry) => void;
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
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

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
          Time Entries
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
