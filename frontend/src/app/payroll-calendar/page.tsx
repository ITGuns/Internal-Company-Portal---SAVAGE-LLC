"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
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
import {
  loadTimeEntries,
  saveTimeEntries,
  getClockedInState,
  setClockedInState,
  type TimeEntry,
} from "@/lib/time-entries";

type EventType = "payday" | "holiday" | "deadline" | "time";

export default function PayrollCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "annual">("monthly");
  const calendarRef = useRef<any>(null);
  const [currentTitle, setCurrentTitle] = useState<string>("February 2026");
  
  // Load initial state from localStorage using lazy initialization
  const [clockedIn, setClockedIn] = useState(() => getClockedInState());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => loadTimeEntries());
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [manualIn, setManualIn] = useState<string>("09:00");
  const [manualOut, setManualOut] = useState<string>("17:00");
  const [manualNotes, setManualNotes] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation function
  const validateTimeEntry = () => {
    const errors: Record<string, string> = {};
    
    if (!manualDate) {
      errors.date = "Date is required";
    } else {
      const entryDate = new Date(manualDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (entryDate > today) {
        errors.date = "Date cannot be in the future";
      }
    }
    
    if (!manualIn) {
      errors.timeIn = "Time In is required";
    }
    
    if (manualOut && manualIn) {
      const timeInDate = new Date(`${manualDate}T${manualIn}`);
      const timeOutDate = new Date(`${manualDate}T${manualOut}`);
      if (timeOutDate <= timeInDate) {
        errors.timeOut = "Time Out must be after Time In";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save time entries to localStorage whenever they change
  useEffect(() => {
    saveTimeEntries(timeEntries);
  }, [timeEntries]);

  // Save clocked-in state whenever it changes
  useEffect(() => {
    setClockedInState(clockedIn);
  }, [clockedIn]);

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

  const displayEvents = useMemo(() => {
    const derived = timeEntries.map((e) => {
      const date = e.start.slice(0, 10);
      const mins =
        e.durationMin != null
          ? e.durationMin
          : e.end
            ? Math.max(
                0,
                Math.round(
                  (new Date(e.end).getTime() - new Date(e.start).getTime()) /
                    60000,
                ),
              )
            : undefined;
      const title =
        mins != null
          ? mins >= 60
            ? `${Math.round(mins / 60)}h`
            : `${mins}m`
          : "IN";
      return {
        id: `time-${e.id}`,
        title,
        start: date,
        extendedProps: { type: "time" as EventType },
      };
    });
    return [...events, ...derived];
  }, [events, timeEntries]);

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
    if (t === "time") return "bg-sky-500/90";
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
              {/* view toggles left side (kept minimal) */}
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
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white">
                <DollarSign className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Pay Days</div>
                <div className="text-lg font-semibold">{stats.payday}</div>
              </div>
            </div>

            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white">
                <X className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Holidays</div>
                <div className="text-lg font-semibold">{stats.holiday}</div>
              </div>
            </div>

            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Deadlines</div>
                <div className="text-lg font-semibold">{stats.deadline}</div>
              </div>
            </div>

            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-sky-500 text-white">
                <CalendarIcon className="w-5 h-5" aria-hidden="true" />
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
                    events={displayEvents}
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

                <Modal
                  isOpen={showAddModal}
                  onClose={() => {
                    setShowAddModal(false);
                    setManualNotes("");
                    setValidationErrors({});
                  }}
                  title="Add Time Entry"
                  subtitle="Manually add a time entry for a specific date"
                  size="md"
                  footer={
                    <>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setShowAddModal(false);
                          setManualNotes("");
                          setValidationErrors({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="success"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                          if (!validateTimeEntry()) {
                            return;
                          }
                          
                          try {
                            const startIso = new Date(
                              `${manualDate}T${manualIn}`,
                            ).toISOString();
                            const endIso = manualOut
                              ? new Date(
                                  `${manualDate}T${manualOut}`,
                                ).toISOString()
                              : undefined;
                            const durationMin = endIso
                              ? Math.max(
                                  0,
                                  Math.round(
                                    (new Date(endIso).getTime() -
                                      new Date(startIso).getTime()) /
                                      60000,
                                  ),
                                )
                              : undefined;
                            const id = String(Date.now());
                            setTimeEntries((s) => [
                              {
                                id,
                                start: startIso,
                                end: endIso,
                                durationMin,
                                notes: manualNotes || undefined,
                              },
                              ...s,
                            ]);
                            setShowAddModal(false);
                            setManualNotes("");
                            setValidationErrors({});
                          } catch {
                            setValidationErrors({ submit: "Invalid date or time format" });
                          }
                        }}
                        disabled={!manualDate || !manualIn}
                      >
                        Add Entry
                      </Button>
                    </>
                  }
                >
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="manual-date"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        Date
                      </label>
                      <input
                        id="manual-date"
                        type="date"
                        value={manualDate}
                        onChange={(e) => {
                          setManualDate(e.target.value);
                          if (validationErrors.date) {
                            setValidationErrors(prev => ({ ...prev, date: "" }));
                          }
                        }}
                        max={new Date().toISOString().slice(0, 10)}
                        className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                          validationErrors.date ? 'border-red-500' : 'border-[var(--border)]'
                        }`}
                      />
                      {validationErrors.date && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="manual-in"
                          className="block text-sm font-medium text-[var(--foreground)] mb-1"
                        >
                          Time In
                        </label>
                        <input
                          id="manual-in"
                          type="time"
                          value={manualIn}
                          onChange={(e) => {
                            setManualIn(e.target.value);
                            if (validationErrors.timeIn) {
                              setValidationErrors(prev => ({ ...prev, timeIn: "" }));
                            }
                          }}
                          className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                            validationErrors.timeIn ? 'border-red-500' : 'border-[var(--border)]'
                          }`}
                        />
                        {validationErrors.timeIn && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.timeIn}</p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="manual-out"
                          className="block text-sm font-medium text-[var(--foreground)] mb-1"
                        >
                          Time Out
                        </label>
                        <input
                          id="manual-out"
                          type="time"
                          value={manualOut}
                          onChange={(e) => {
                            setManualOut(e.target.value);
                            if (validationErrors.timeOut) {
                              setValidationErrors(prev => ({ ...prev, timeOut: "" }));
                            }
                          }}
                          className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                            validationErrors.timeOut ? 'border-red-500' : 'border-[var(--border)]'
                          }`}
                        />
                        {validationErrors.timeOut && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.timeOut}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="manual-notes"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        Notes{" "}
                        <span className="text-[var(--muted)] font-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        id="manual-notes"
                        type="text"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="e.g. Overtime, client meeting..."
                        className="w-full border border-[var(--border)] rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </div>
                  </div>
                </Modal>
              </div>

              <div>
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
                          onClick={() => {
                            const now = new Date();
                            const id = String(now.getTime());
                            setTimeEntries((s) => [
                              { id, start: now.toISOString() },
                              ...s,
                            ]);
                            setClockedIn(true);
                          }}
                          className="px-4 py-2 rounded bg-emerald-600 text-white flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          Clock In
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const now = new Date();
                            setTimeEntries((s) => {
                              const copy = [...s];
                              const idx = copy.findIndex((e) => !e.end);
                              if (idx !== -1) {
                                const entry = { ...copy[idx] };
                                entry.end = now.toISOString();
                                entry.durationMin = Math.max(
                                  0,
                                  Math.round(
                                    (new Date(entry.end).getTime() -
                                      new Date(entry.start).getTime()) /
                                      60000,
                                  ),
                                );
                                copy[idx] = entry;
                              }
                              return copy;
                            });
                            setClockedIn(false);
                          }}
                          className="px-4 py-2 rounded bg-red-600 text-white flex items-center gap-2"
                        >
                          <Square className="w-4 h-4" aria-hidden="true" />
                          Clock Out
                        </button>
                      )}

                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--card-surface)] transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Manual
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="text-xs text-[var(--muted)]">
                        Today's Total
                      </div>
                      <div className="text-lg font-semibold">
                        {(() => {
                          const today = new Date().toISOString().slice(0, 10);
                          const mins = timeEntries.reduce((acc, e) => {
                            const startDay = e.start.slice(0, 10);
                            if (startDay !== today) return acc;
                            if (e.durationMin != null)
                              return acc + e.durationMin;
                            const end = e.end ? new Date(e.end) : new Date();
                            return (
                              acc +
                              Math.max(
                                0,
                                Math.round(
                                  (end.getTime() -
                                    new Date(e.start).getTime()) /
                                    60000,
                                ),
                              )
                            );
                          }, 0);
                          return `${mins}m`;
                        })()}
                      </div>
                    </div>

                    <div className="text-xs text-[var(--muted)] mb-2">
                      TODAY'S ENTRIES
                    </div>
                    <ul className="space-y-2">
                      {(() => {
                        const today = new Date().toISOString().slice(0, 10);
                        return timeEntries
                          .filter((e) => e.start.slice(0, 10) === today)
                          .map((e) => {
                            const start = new Date(e.start);
                            const end = e.end ? new Date(e.end) : null;
                            const label = end
                              ? `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - --:--`;
                            const mins =
                              e.durationMin != null
                                ? e.durationMin
                                : end
                                  ? Math.max(
                                      0,
                                      Math.round(
                                        (end.getTime() - start.getTime()) /
                                          60000,
                                      ),
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
                                    onClick={() =>
                                      setTimeEntries((s) =>
                                        s.filter((x) => x.id !== e.id),
                                      )
                                    }
                                    className="p-1 rounded border bg-[var(--card-bg)] text-[var(--muted)] hover:bg-red-600 hover:text-white transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            );
                          });
                      })()}
                    </ul>
                  </div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
                  <div className="text-sm font-semibold">
                    {selectedEvent && selectedEvent.date
                      ? new Date(
                          selectedEvent.date as string,
                        ).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })
                      : "Event Details"}
                  </div>
                  <div className="mt-3">
                    {selectedEvent && selectedEvent.date ? (
                      (() => {
                        const dateStr = selectedEvent.date as string;
                        const eventsForDate = events.filter(
                          (e: any) => e.start === dateStr,
                        );
                        return eventsForDate.length ? (
                          eventsForDate.map((e: any) => (
                            <div
                              key={e.id}
                              className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded mb-3"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-10 h-10 flex items-center justify-center rounded-full text-white ${e.extendedProps?.type === "payday" ? "bg-emerald-500" : e.extendedProps?.type === "holiday" ? "bg-red-500" : "bg-amber-500"}`}
                                >
                                  {e.extendedProps?.type === "payday" ? (
                                    <DollarSign className="w-5 h-5" aria-hidden="true" />
                                  ) : e.extendedProps?.type === "holiday" ? (
                                    <X className="w-5 h-5" aria-hidden="true" />
                                  ) : (
                                    <Clock className="w-5 h-5" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{e.title}</div>
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
                                        : e.extendedProps?.type === "holiday"
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
                        );
                      })()
                    ) : (
                      <div className="text-[var(--muted)]">
                        Select a date on the calendar to view details.
                      </div>
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
