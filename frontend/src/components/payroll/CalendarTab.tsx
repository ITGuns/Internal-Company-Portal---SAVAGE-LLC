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
} from "lucide-react";
import StatCard from "./StatCard";
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" aria-hidden="true" />}
          label="Pay Days"
          value={stats.payday}
          bgColor="bg-emerald-500"
        />
        <StatCard
          icon={<X className="w-5 h-5" aria-hidden="true" />}
          label="Holidays"
          value={stats.holiday}
          bgColor="bg-red-500"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" aria-hidden="true" />}
          label="Deadlines"
          value={stats.deadline}
          bgColor="bg-amber-500"
        />
        <StatCard
          icon={<CalendarIcon className="w-5 h-5" aria-hidden="true" />}
          label="Total Events"
          value={stats.total}
          bgColor="bg-sky-500"
        />
      </div>

      {/* Enhanced Legend Bar */}
      <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-surface)]/50 backdrop-blur-md shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
          <div className="flex items-center gap-2 group cursor-default">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 group-hover:ring-emerald-500/20 transition-[box-shadow] shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Pay Day</span>
          </div>

          <div className="flex items-center gap-2 group cursor-default">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/10 group-hover:ring-red-500/20 transition-[box-shadow] shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Holiday</span>
          </div>

          <div className="flex items-center gap-2 group cursor-default">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/10 group-hover:ring-amber-500/20 transition-[box-shadow] shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Deadline</span>
          </div>

          <div className="flex items-center gap-2 group cursor-default">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10 group-hover:ring-indigo-500/20 transition-[box-shadow] shadow-[0_0_10px_rgba(79,70,229,0.3)]" />
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Meeting</span>
          </div>

          <div className="h-4 w-px bg-[var(--border)] mx-1 hidden sm:block" />

          <div className="flex items-center gap-2 group cursor-default">
            <div className="flex items-center justify-center w-5 h-5 rounded bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600/20 transition-colors">
              <Clock className="w-3 h-3" />
            </div>
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Clock In</span>
          </div>

          <div className="flex items-center gap-2 group cursor-default">
            <div className="flex items-center justify-center w-5 h-5 rounded bg-red-600/10 text-red-600 group-hover:bg-red-600/20 transition-colors">
              <LogOut className="w-3 h-3" />
            </div>
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Clock Out</span>
          </div>

          <div className="flex items-center gap-2 group cursor-default">
            <div className="flex items-center justify-center w-5 h-5 rounded bg-sky-600/10 text-sky-600 group-hover:bg-sky-600/20 transition-colors">
              <BarChart3 className="w-3 h-3" />
            </div>
            <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--foreground)] transition-colors">Day Total</span>
          </div>
        </div>
      </div>

      {/* Calendar + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* FullCalendar */}
        <div className="lg:col-span-2">
          <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-4">
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
                      className={`px-1.5 py-0.5 rounded text-white text-[10px] w-full truncate overflow-hidden font-medium flex items-center gap-1 ${bg}`}
                      title={evt.title + " (permanent record)"}
                    >
                      <span className="truncate">{evt.title}</span>
                      <span className="text-white/80 ml-auto text-[9px] flex-shrink-0">🔒</span>
                    </div>
                  );
                }

                return (
                  <div
                    className={`px-2 py-1 rounded text-white text-xs w-full truncate overflow-hidden ${colorForType(t)}`}
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
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Time Clock</div>
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
                    onClick={onClockIn}
                    className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2 transition-colors"
                  >
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    Clock In
                  </button>
                ) : (
                  <button
                    onClick={onClockOut}
                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors"
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
                onClick={onAddManualEntry}
                className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--card-surface)] transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
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
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
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
                        aria-label="Edit entry"
                        onClick={() => setEditingEntry(e)}
                        className="p-1 rounded border border-transparent bg-transparent text-[var(--muted)] hover:bg-sky-600 hover:text-white transition-colors"
                        title="Edit entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        aria-label="Delete entry"
                        onClick={() => setDeleteTarget(e)}
                        className="p-1 rounded border border-transparent bg-transparent text-[var(--muted)] hover:bg-red-600 hover:text-white transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

          {/* ── Upcoming Events ── */}
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4">
            <div className="text-sm font-semibold mb-3">Upcoming Events</div>
            <ul className="space-y-3">
              {events
                .filter((e: CalendarEvent) => e.extendedProps.type !== "time")
                .sort((a: CalendarEvent, b: CalendarEvent) => a.start.localeCompare(b.start))
                .map((e: CalendarEvent) => (
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
                ))}
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
