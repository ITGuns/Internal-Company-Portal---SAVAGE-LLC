"use client";

import React, { useMemo, useState, useRef } from "react";
import Header from "@/components/Header";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

type EventType = "payday" | "holiday" | "deadline";

export default function PayrollCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "annual">("monthly");
  const calendarRef = useRef<any>(null);
  const [currentTitle, setCurrentTitle] = useState<string>("February 2026");

  const events = useMemo(() => {
    return [
      {
        id: "holiday-1",
        title: "Presidents' Day",
        start: "2026-02-16",
        extendedProps: { type: "holiday" as EventType },
      },
      {
        id: "deadline-1",
        title: "Timesheet Submission Due",
        start: "2026-02-20",
        extendedProps: { type: "deadline" as EventType },
      },
      {
        id: "deadline-2",
        title: "Payroll Processing Deadline",
        start: "2026-02-25",
        extendedProps: { type: "deadline" as EventType },
      },
      {
        id: "payday-1",
        title: "Pay Day",
        start: "2026-02-27",
        extendedProps: { type: "payday" as EventType },
      },
    ];
  }, []);

  const stats = useMemo(() => {
    const payday = events.filter(
      (e) => e.extendedProps.type === "payday",
    ).length;
    const holiday = events.filter(
      (e) => e.extendedProps.type === "holiday",
    ).length;
    const deadline = events.filter(
      (e) => e.extendedProps.type === "deadline",
    ).length;
    return { payday, holiday, deadline, total: events.length };
  }, [events]);

  function colorForType(t?: EventType) {
    if (t === "payday") return "bg-emerald-500/90";
    if (t === "holiday") return "bg-red-500/90";
    if (t === "deadline") return "bg-amber-500/90";
    return "bg-slate-400";
  }

  return (
    <main
      style={{ minHeight: "calc(100vh - var(--header-height))" }}
      className="bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0">
        <Header
          title="Payroll Calendar"
          subtitle="Track pay periods, deadlines, and holidays"
        />

        <div className="mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md bg-transparent p-0 border border-transparent">
                <button
                  type="button"
                  onClick={() => setViewMode("monthly")}
                  aria-pressed={viewMode === "monthly"}
                  className={`px-3 py-2 rounded-l-md border text-sm ${
                    viewMode === "monthly"
                      ? "bg-[var(--card-bg)] border-[var(--accent)] text-[var(--foreground)]"
                      : "bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  Monthly View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("annual")}
                  aria-pressed={viewMode === "annual"}
                  className={`px-3 py-2 rounded-r-md border text-sm ${
                    viewMode === "annual"
                      ? "bg-[var(--card-bg)] border-[var(--accent)] text-[var(--foreground)]"
                      : "bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  Annual Overview
                </button>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  calendarRef.current?.getApi().prev();
                }}
                aria-label="Previous"
                className="px-3 py-2 rounded border bg-[var(--card-bg)]"
              >
                ◀
              </button>
              <div className="px-3 py-2 rounded border bg-[var(--card-bg)]">
                {currentTitle}
              </div>
              <button
                onClick={() => {
                  calendarRef.current?.getApi().next();
                }}
                aria-label="Next"
                className="px-3 py-2 rounded border bg-[var(--card-bg)]"
              >
                ▶
              </button>
              <button
                onClick={() => {
                  calendarRef.current?.getApi().today();
                }}
                aria-label="Today"
                className="px-3 py-2 rounded border bg-[var(--card-bg)]"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white text-sm">
                $
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Pay Days</div>
                <div className="text-lg font-semibold">{stats.payday}</div>
              </div>
            </div>

            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white text-sm">
                ✖
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Holidays</div>
                <div className="text-lg font-semibold">{stats.holiday}</div>
              </div>
            </div>

            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white text-sm">
                ⏱
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Deadlines</div>
                <div className="text-lg font-semibold">{stats.deadline}</div>
              </div>
            </div>

            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-sky-500 text-white text-sm">
                📅
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Total Events</div>
                <div className="text-lg font-semibold">{stats.total}</div>
              </div>
            </div>
          </div>

          <div className="mb-3 text-xs text-[var(--muted)] flex items-center gap-4">
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
              <span className="w-3 h-3 rounded-full bg-sky-500" /> Today
            </div>
          </div>

          {viewMode === "monthly" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-4">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    initialDate="2026-02-01"
                    headerToolbar={false}
                    events={events}
                    eventContent={(arg) => {
                      const evt: any = arg.event;
                      const t = evt.extendedProps?.type as
                        | EventType
                        | undefined;
                      return (
                        <div
                          className={`px-2 py-1 rounded text-white text-xs ${colorForType(t)}`}
                        >
                          {evt.title.length > 18
                            ? evt.title.slice(0, 18) + "..."
                            : evt.title}
                        </div>
                      );
                    }}
                    datesSet={(info) => setCurrentTitle(info.view.title)}
                    dateClick={(info) =>
                      setSelectedEvent({ date: info.dateStr })
                    }
                    eventClick={(info) =>
                      setSelectedEvent({ date: info.event.startStr })
                    }
                    height={600}
                  />
                </div>
              </div>

              <div>
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
                  <div className="text-sm font-semibold">Event Details</div>
                  <div className="mt-3 text-sm text-[var(--muted)]">
                    {selectedEvent && selectedEvent.date ? (
                      (() => {
                        const dateStr = selectedEvent.date as string;
                        const eventsForDate = events.filter(
                          (e: any) => e.start === dateStr,
                        );
                        return (
                          <div>
                            <div className="text-base font-medium mb-3">
                              {new Date(dateStr).toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            {eventsForDate.length ? (
                              eventsForDate.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded mb-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`w-10 h-10 flex items-center justify-center rounded-full text-white text-sm ${e.extendedProps?.type === "payday" ? "bg-emerald-500" : e.extendedProps?.type === "holiday" ? "bg-red-500" : "bg-amber-500"}`}
                                    >
                                      {e.extendedProps?.type === "payday"
                                        ? "$"
                                        : e.extendedProps?.type === "holiday"
                                          ? "✖"
                                          : "⏱"}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium">
                                          {e.title}
                                        </div>
                                        <div className="text-xs px-2 py-1 rounded-full bg-[var(--card-surface)] text-[var(--muted)]">
                                          {String(
                                            e.extendedProps?.type || "",
                                          ).replace(/^[a-z]/, (c) =>
                                            c.toUpperCase(),
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs text-[var(--muted)] mt-2">
                                        {e.description ||
                                          (e.extendedProps?.type === "payday"
                                            ? "Employees will receive their paycheck on this date."
                                            : e.extendedProps?.type ===
                                                "holiday"
                                              ? "Company-observed holiday."
                                              : "Deadline for payroll-related tasks.")}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-[var(--muted)]">
                                No events on this date.
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div>Select a date on the calendar to view details.</div>
                    )}
                  </div>
                </div>

                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4">
                  <div className="text-sm font-semibold">Upcoming Events</div>
                  <ul className="mt-3 space-y-3">
                    {events.map((e: any) => (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-3 h-3 rounded-full ${e.extendedProps.type === "payday" ? "bg-emerald-500" : e.extendedProps.type === "holiday" ? "bg-red-500" : "bg-amber-500"}`}
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
          ) : (
            <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-6">
              <div className="text-lg font-semibold mb-4">
                Annual Overview — 2026
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* compute monthly stats and render boxes */}
                {(() => {
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

                  // compute stats per month
                  const monthlyStats = months.map((_, idx) => {
                    const monthEvents = events.filter((e: any) => {
                      try {
                        return new Date(e.start).getMonth() === idx;
                      } catch (err) {
                        return false;
                      }
                    });
                    const payday = monthEvents.filter(
                      (m: any) => m.extendedProps?.type === "payday",
                    ).length;
                    const holiday = monthEvents.filter(
                      (m: any) => m.extendedProps?.type === "holiday",
                    ).length;
                    const deadline = monthEvents.filter(
                      (m: any) => m.extendedProps?.type === "deadline",
                    ).length;
                    return { payday, holiday, deadline };
                  });

                  return months.map((m, i) => (
                    <div
                      key={m}
                      className="p-4 border border-[var(--border)] rounded bg-[var(--card-surface)]"
                    >
                      <div className="font-medium mb-2">{m}</div>
                      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{monthlyStats[i].payday}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span>{monthlyStats[i].holiday}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{monthlyStats[i].deadline}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
