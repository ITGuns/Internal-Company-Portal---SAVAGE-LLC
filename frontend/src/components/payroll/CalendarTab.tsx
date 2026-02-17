/**
 * Calendar Tab - main payroll calendar view with time tracking
 */

import React, { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  DollarSign,
  X,
  Clock,
  Calendar as CalendarIcon,
  Square,
  Trash2,
  Plus,
} from "lucide-react";
import StatCard from "./StatCard";
import EventCard from "./EventCard";
import type { CalendarEvent, PayrollStats } from "@/lib/payroll-calendar/types";
import type { TimeEntry } from "@/lib/time-entries";
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
  onDeleteTimeEntry: (id: string) => void;
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
  onDeleteTimeEntry,
}: CalendarTabProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calculate today's total time
  const todayTotal = (() => {
    const today = getLocalDateString(new Date());
    const mins = timeEntries.reduce((acc, e) => {
      const startDay = getLocalDateString(e.start);
      if (startDay !== today) return acc;
      if (e.durationMin != null) return acc + e.durationMin;
      const end = e.end ? new Date(e.end) : new Date();
      return (
        acc +
        Math.max(
          0,
          Math.round((end.getTime() - new Date(e.start).getTime()) / 60000)
        )
      );
    }, 0);
    return `${mins}m`;
  })();

  // Filter today's entries
  const todayEntries = (() => {
    const today = getLocalDateString(new Date());
    return timeEntries.filter((e) => getLocalDateString(e.start) === today);
  })();

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

      {/* Legend */}
      <div className="mb-3 text-xs text-[var(--muted)] flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" /> Pay Day
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" /> Holiday
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" /> Deadline
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500" /> Meeting
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-500" /> Time
        </div>
      </div>

      {/* Calendar + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate="2026-02-01"
              headerToolbar={false}
              events={displayEvents}
              eventContent={(arg) => {
                const evt = arg.event;
                const t = evt.extendedProps?.type;
                return (
                  <div
                    className={`px-2 py-1 rounded text-white text-xs ${colorForType(
                      t
                    )}`}
                  >
                    {evt.title.length > 18
                      ? evt.title.slice(0, 18) + "..."
                      : evt.title}
                  </div>
                );
              }}
              datesSet={(info) => onTitleChange(info.view.title)}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              eventClick={(info) =>
                setSelectedDate(info.event.startStr)
              }
              height={600}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Time Clock */}
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Time Clock</div>
              {clockedIn ? (
                <div className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse inline-block" />
                  <span>Clocked In</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-3 mb-3">
                {!clockedIn ? (
                  <button
                    onClick={onClockIn}
                    className="px-4 py-2 rounded bg-emerald-600 text-white flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    Clock In
                  </button>
                ) : (
                  <button
                    onClick={onClockOut}
                    className="px-4 py-2 rounded bg-red-600 text-white flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" aria-hidden="true" />
                    Clock Out
                  </button>
                )}

                <button
                  onClick={onAddManualEntry}
                  className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--card-surface)] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Manual
                </button>
              </div>

              <div className="mb-3">
                <div className="text-xs text-[var(--muted)]">Today&apos;s Total</div>
                <div className="text-lg font-semibold">{todayTotal}</div>
              </div>

              <div className="text-xs text-[var(--muted)] mb-2">
                TODAY&apos;S ENTRIES
              </div>
              <ul className="space-y-2">
                {todayEntries.map((e) => {
                  const start = new Date(e.start);
                  const end = e.end ? new Date(e.end) : null;
                  const label = end
                    ? `${start.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} - ${end.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : `${start.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} - --:--`;
                  const mins =
                    e.durationMin != null
                      ? e.durationMin
                      : end
                        ? Math.max(
                            0,
                            Math.round(
                              (end.getTime() - start.getTime()) / 60000
                            )
                          )
                        : 0;
                  return (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <div className="text-sm">{label}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-[var(--muted)]">
                          {end ? `${mins}m` : "In progress"}
                        </div>
                        <button
                          aria-label="Delete entry"
                          onClick={() => onDeleteTimeEntry(e.id)}
                          className="p-1 rounded border bg-[var(--card-bg)] text-[var(--muted)] hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Event Details */}
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
            <div className="text-sm font-semibold">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString(
                    undefined,
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }
                  )
                : "Event Details"}
            </div>
            <div className="mt-3">
              {selectedDate ? (
                (() => {
                  const dateStr = selectedDate;
                  const eventsForDate = events.filter(
                    (e: CalendarEvent) => e.start === dateStr
                  );
                  return eventsForDate.length ? (
                    eventsForDate.map((e: CalendarEvent) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        onEdit={() => onEditEvent(e)}
                        onDelete={() => onDeleteEvent(e)}
                      />
                    ))
                  ) : (
                    <div className="text-[var(--muted)]">
                      No events on this date.
                    </div>
                  );
                })()
              ) : (
                <div className="text-[var(--muted)]">
                  Select a date on the calendar to view details.
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4">
            <div className="text-sm font-semibold">Upcoming Events</div>
            <ul className="mt-3 space-y-3">
              {events
                .filter((e: CalendarEvent) => e.extendedProps.type !== "time")
                .sort((a: CalendarEvent, b: CalendarEvent) => a.start.localeCompare(b.start))
                .map((e: CalendarEvent) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full ${dotForType(
                          e.extendedProps.type
                        )}`}
                      />
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
                    <div className="text-xs text-[var(--muted)]">
                      {new Date(e.start).toLocaleDateString()}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
