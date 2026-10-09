/**
 * Calendar Tab - main payroll calendar view with time tracking
 */

import React, { useRef, useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  DollarSign,
  X,
  Clock,
  Calendar as CalendarIcon,
  Square,
  Edit2,
  Trash2,
  Plus,
  LogOut,
  BarChart3,
  LockKeyhole,
} from "lucide-react";
import AddTimeEntryModal from "./AddTimeEntryModal";
import PayrollDayDetailPanel from "./PayrollDayDetailPanel";
import TimeEntryDeleteModal from "./TimeEntryDeleteModal";
import type { CalendarEvent, PayrollStats } from "@/lib/payroll-calendar/types";
import type { TimeEntry } from "@/lib/time-entries";
import {
  getPayrollDayAudit,
  type PayrollAuditEntry,
} from "@/lib/payroll-calendar/day-audit";
import { colorForType, dotForType, getLocalDateString } from "@/lib/payroll-calendar/utils";

interface CalendarTabProps {
  displayEvents: CalendarEvent[];
  events: CalendarEvent[];
  stats: PayrollStats;
  timeEntries: TimeEntry[];
  clockedIn: boolean;
  onTitleChange: (title: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onAddManualEntry: () => void;
  onEditTimeEntry: (id: string, startIso: string, endIso?: string, notes?: string, userId?: string) => Promise<boolean>;
  onDeleteTimeEntry: (id: string) => Promise<void> | void;
  isOwnTimeView?: boolean;
  auditEmployeeLabel?: string;
}

/** Format total seconds into "Xh XXm XXs" or "Xm XXs" */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Format completed minutes into "Xh Xm" or "Xm" */
function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CalendarTab({
  displayEvents,
  events,
  stats,
  timeEntries,
  clockedIn,
  onTitleChange,
  onEditEvent,
  onDeleteEvent,
  onClockIn,
  onClockOut,
  onAddManualEntry,
  onEditTimeEntry,
  onDeleteTimeEntry,
  isOwnTimeView = true,
  auditEmployeeLabel,
}: CalendarTabProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<PayrollAuditEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollAuditEntry | null>(null);
  // Ticks every second so active timers update live
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = getLocalDateString(new Date());
  const todayAudit = useMemo(
    () => getPayrollDayAudit(timeEntries, { date: today, now }),
    [timeEntries, today, now],
  );
  const selectedDayAudit = useMemo(
    () => selectedDate ? getPayrollDayAudit(timeEntries, { date: selectedDate, now }) : null,
    [selectedDate, timeEntries, now],
  );
  const todayEntries = todayAudit.entries;
  const upcomingEvents = useMemo(
    () => events
      .filter((event: CalendarEvent) => event.extendedProps.type !== "time" && event.start >= today)
      .sort((a: CalendarEvent, b: CalendarEvent) => a.start.localeCompare(b.start))
      .slice(0, 8),
    [events, today],
  );

  // Calculate today's total — completed entries use durationMin, active entry uses live elapsed
  const todayTotalSeconds = todayEntries.reduce((acc, e) => {
    if (e.durationMin != null) return acc + e.durationMin * 60;
    // Active entry (no end) — count live elapsed seconds
    return acc + Math.max(0, Math.round((now.getTime() - new Date(e.start).getTime()) / 1000));
  }, 0);

  async function handleConfirmDeleteTimeEntry(entryId: string) {
    await onDeleteTimeEntry(entryId);
  }

  async function handleSubmitEditTimeEntry(
    startIso: string,
    endIso?: string,
    notes?: string,
    userId?: string,
  ) {
    if (!editingEntry) return false;

    const success = await onEditTimeEntry(editingEntry.id, startIso, endIso, notes, userId);
    if (success) setEditingEntry(null);
    return success;
  }

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-600 dark:text-sky-300">
              <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Payroll Calendar
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              Schedule, payroll, and time audit
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              Track payroll events and inspect daily time records without leaving the calendar.
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-2 text-sm sm:text-right">
            <div className="rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2">
              <div className="text-[11px] font-medium uppercase text-[var(--muted)]">Today</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--foreground)]">
                {formatElapsed(todayTotalSeconds)}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2">
              <div className="text-[11px] font-medium uppercase text-[var(--muted)]">Entries</div>
              <div className="mt-1 text-base font-semibold text-[var(--foreground)]">
                {todayEntries.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Pay Days", value: stats.payday, icon: DollarSign, tone: "text-emerald-600 bg-emerald-500/10" },
            { label: "Holidays", value: stats.holiday, icon: X, tone: "text-red-600 bg-red-500/10" },
            { label: "Deadlines", value: stats.deadline, icon: Clock, tone: "text-amber-600 bg-amber-500/10" },
            { label: "Total Events", value: stats.total, icon: CalendarIcon, tone: "text-sky-600 bg-sky-500/10" },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="flex items-center gap-3 bg-[var(--card-surface)] px-4 py-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${metric.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--muted)]">{metric.label}</div>
                  <div className="text-lg font-semibold text-[var(--foreground)]">{metric.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 text-xs">
          {[
            { label: "Pay Day", dot: "bg-emerald-500" },
            { label: "Holiday", dot: "bg-red-500" },
            { label: "Deadline", dot: "bg-amber-500" },
            { label: "Meeting", dot: "bg-indigo-500" },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 font-medium text-[var(--muted)]">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} aria-hidden="true" />
              {item.label}
            </span>
          ))}
          <span className="hidden h-4 w-px bg-[var(--border)] sm:inline-block" aria-hidden="true" />
          <span className="inline-flex items-center gap-2 font-medium text-[var(--muted)]">
            <Clock className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Clock In
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-[var(--muted)]">
            <LogOut className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
            Clock Out
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-[var(--muted)]">
            <BarChart3 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Day Total
          </span>
        </div>
      </section>

      {/* Calendar + Sidebar Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* FullCalendar */}
        <div className="lg:col-span-2">
          <div className="min-h-[632px] rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 sm:p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={new Date().toISOString().split("T")[0]}
              headerToolbar={false}
              events={displayEvents}
              eventContent={(arg) => {
                const evt = arg.event;
                const t = evt.extendedProps?.type;
                const isClockEntry = evt.extendedProps?.clockEntry;
                const direction = evt.extendedProps?.direction;

                if (isClockEntry) {
                  // Direction-specific colours: green=in, red=out, blue=total
                  const bg =
                    direction === "in"
                      ? "bg-emerald-700 dark:bg-emerald-700"
                      : direction === "out"
                        ? "bg-red-800 dark:bg-red-700"
                        : "bg-sky-800 dark:bg-sky-700";
                  return (
                    <div
                      className={`flex w-full items-center gap-1 overflow-hidden truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${bg}`}
                      title={`${evt.title} (permanent record)`}
                    >
                      <span className="truncate">{evt.title}</span>
                      <LockKeyhole className="ml-auto h-3 w-3 flex-shrink-0 text-white/80" aria-hidden="true" />
                    </div>
                  );
                }

                return (
                  <div
                    className={`w-full overflow-hidden truncate rounded px-2 py-1 text-xs text-white ${colorForType(t)}`}
                  >
                    {evt.title}
                  </div>
                );
              }}
              datesSet={(info) => onTitleChange(info.view.title)}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              eventClick={(info) => {
                // Clock entries just highlight the date — no detail panel
                setSelectedDate(info.event.startStr);
              }}
              height={600}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* ── Time Clock ── */}
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--card-surface)] p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Time Clock</h3>
              {!isOwnTimeView ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-2 py-1 text-xs font-medium text-sky-600">
                  Audit View
                </div>
              ) : clockedIn && (
                <div className="inline-flex items-center gap-2 bg-emerald-700 text-white text-xs px-2 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse inline-block" />
                  <span>Clocked In</span>
                </div>
              )}
            </div>

            {/* Clock In / Out buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {isOwnTimeView ? (
                !clockedIn ? (
                  <button
                    type="button"
                    onClick={onClockIn}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
                  >
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    Clock In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClockOut}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    <Square className="w-4 h-4" aria-hidden="true" />
                    Clock Out
                  </button>
                )
              ) : (
                <div className="w-full rounded border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                  Viewing {auditEmployeeLabel || "selected employee"}. Clock in/out controls are only available on your own time view.
                </div>
              )}
              <button
                type="button"
                onClick={onAddManualEntry}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--card-surface)]"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Manual
              </button>
            </div>

            {/* Live today's total */}
            <div className="mb-4">
              <div className="text-xs text-[var(--muted)] mb-0.5">Today&apos;s Total</div>
              <div className={`text-xl font-bold font-mono tabular-nums ${clockedIn ? "text-emerald-500" : "text-[var(--foreground)]"}`}>
                {formatElapsed(todayTotalSeconds)}
              </div>
            </div>

            {/* Today's entry list */}
            <div className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
              Today&apos;s Entries
            </div>
            <ul className="space-y-2">
              {todayEntries.length === 0 && (
                <li className="text-xs text-[var(--muted)] italic">No entries yet today.</li>
              )}
              {todayEntries.map((e) => {
                const start = new Date(e.start);
                const end = e.end ? new Date(e.end) : null;
                const isActive = !end;

                const elapsedSecs = isActive
                  ? Math.max(0, Math.round((now.getTime() - start.getTime()) / 1000))
                  : null;

                const clockInStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const clockOutStr = end
                  ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : null;

                const completedMins =
                  e.durationMin != null
                    ? e.durationMin
                    : end
                      ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
                      : null;

                return (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${isActive ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-[var(--card-bg)]"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 flex-shrink-0 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-sky-500"}`}
                      />
                      <div className="text-sm font-medium text-[var(--foreground)] truncate">
                        {/* Clock-in time → clock-out time (live if active) */}
                        {clockInStr}
                        {clockOutStr ? (
                          <span className="text-[var(--muted)]"> → {clockOutStr}</span>
                        ) : (
                          <span className="text-emerald-500 font-mono">
                            {" "}→ {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Duration — ticking for active entry */}
                      <span className={`text-xs font-mono tabular-nums ${isActive ? "text-emerald-500 font-semibold" : "text-[var(--muted)]"}`}>
                        {isActive && elapsedSecs !== null
                          ? formatElapsed(elapsedSecs)
                          : completedMins !== null
                            ? formatMinutes(completedMins)
                            : "—"}
                      </span>
                      <button
                        type="button"
                        aria-label="Edit entry"
                        onClick={() => setEditingEntry(e)}
                        className="rounded border border-transparent bg-transparent p-1.5 text-[var(--muted)] transition-colors hover:bg-sky-600 hover:text-white"
                        title="Edit entry"
                      >
                        <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete entry"
                        onClick={() => setDeleteTarget(e)}
                        className="rounded border border-transparent bg-transparent p-1.5 text-[var(--muted)] transition-colors hover:bg-red-600 hover:text-white"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Day details */}
          <PayrollDayDetailPanel
            selectedDate={selectedDate}
            audit={selectedDayAudit}
            events={events}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onRequestEditEntry={setEditingEntry}
            onRequestDeleteEntry={setDeleteTarget}
          />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold">Upcoming Events</h3>
            <ul className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <li className="rounded border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
                  No upcoming payroll events.
                </li>
              ) : (
                upcomingEvents.map((e: CalendarEvent) => (
                  <li key={e.id} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dotForType(e.extendedProps.type)}`} />
                      <div>
                        <div className="text-sm">{e.title}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {new Date(e.start).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--muted)] flex-shrink-0">
                      {new Date(e.start).toLocaleDateString()}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
      <TimeEntryDeleteModal
        entry={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteTimeEntry}
      />
      <AddTimeEntryModal
        isOpen={Boolean(editingEntry)}
        onClose={() => setEditingEntry(null)}
        onSubmit={handleSubmitEditTimeEntry}
        mode="edit"
        editingEntry={editingEntry}
        initialUserId={editingEntry?.userId}
        auditContextLabel={!isOwnTimeView ? auditEmployeeLabel : undefined}
      />
    </>
  );
}
