"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { apiFetch } from "@/lib/api";

type EventType = "payday" | "holiday" | "deadline" | "time";

export default function PayrollCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "annual">("monthly");
  const calendarRef = useRef<any>(null);
  const [currentTitle, setCurrentTitle] = useState<string>("Loading...");
  const [clockedIn, setClockedIn] = useState(false);

  const [events, setEvents] = useState<any[]>([]); // Calendar Events
  const [timeEntries, setTimeEntries] = useState<any[]>([]); // Clock entries

  const [showAddModal, setShowAddModal] = useState(false);
  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [manualIn, setManualIn] = useState<string>("09:00");
  const [manualOut, setManualOut] = useState<string>("17:00");
  const [manualNotes, setManualNotes] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [evtRes, timeRes] = await Promise.all([
        apiFetch('/payroll/events'),
        apiFetch('/payroll/time-entries')
      ]);

      if (evtRes.ok) {
        const rawEvts = await evtRes.json();
        setEvents(rawEvts.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.date,
          extendedProps: { type: e.type, description: e.description }
        })));
      }

      if (timeRes.ok) {
        const entries = await timeRes.json();
        setTimeEntries(entries);
        // Check if clocking in specific
        const open = entries.find((e: any) => !e.end);
        setClockedIn(!!open);
      }

    } catch (e) { console.error(e); }
  }

  const displayEvents = useMemo(() => {
    const derived = timeEntries.map((e) => {
      const date = e.start.slice(0, 10);
      const mins = e.duration;
      // If duration is null (clocked in), calc live? Or just show "IN"

      const title = mins != null
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
    return { payday, holiday, deadline, total: events.length + timeEntries.length };
  }, [events, timeEntries]);

  function colorForType(t?: EventType) {
    if (t === "payday") return "bg-emerald-500/90";
    if (t === "holiday") return "bg-red-500/90";
    if (t === "deadline") return "bg-amber-500/90";
    if (t === "time") return "bg-sky-500/90";
    return "bg-slate-400";
  }

  async function handleClockIn() {
    try {
      const res = await apiFetch('/payroll/clock-in', { method: 'POST' });
      if (res.ok) {
        setClockedIn(true);
        loadData();
      } else {
        alert('Clock in failed');
      }
    } catch (e) { console.error(e); }
  }

  async function handleClockOut() {
    try {
      const res = await apiFetch('/payroll/clock-out', { method: 'POST' });
      if (res.ok) {
        setClockedIn(false);
        loadData();
      }
    } catch (e) { console.error(e); }
  }

  async function handleManualEntry() {
    if (!manualDate || !manualIn) return;

    const startIso = new Date(`${manualDate}T${manualIn}`).toISOString();
    const endIso = manualOut ? new Date(`${manualDate}T${manualOut}`).toISOString() : null;

    try {
      const res = await apiFetch('/payroll/entry', {
        method: 'POST',
        body: JSON.stringify({
          start: startIso,
          end: endIso,
          notes: manualNotes
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        loadData();
      }
    } catch (e) { console.error(e); }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    await apiFetch(`/payroll/entry/${id}`, { method: 'DELETE' });
    loadData();
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
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  calendarRef.current?.getApi().prev();
                }}
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
                className="px-3 py-2 rounded border bg-[var(--card-bg)]"
              >
                ▶
              </button>
              <button
                onClick={() => {
                  calendarRef.current?.getApi().today();
                }}
                className="px-3 py-2 rounded border bg-[var(--card-bg)]"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white text-sm">$</div>
              <div><div className="text-xs text-[var(--muted)]">Pay Days</div><div className="text-lg font-semibold">{stats.payday}</div></div>
            </div>
            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white text-sm">✖</div>
              <div><div className="text-xs text-[var(--muted)]">Holidays</div><div className="text-lg font-semibold">{stats.holiday}</div></div>
            </div>
            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white text-sm">⏱</div>
              <div><div className="text-xs text-[var(--muted)]">Deadlines</div><div className="text-lg font-semibold">{stats.deadline}</div></div>
            </div>
            <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-sky-500 text-white text-sm">📅</div>
              <div><div className="text-xs text-[var(--muted)]">Total Events</div><div className="text-lg font-semibold">{stats.total}</div></div>
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
                    headerToolbar={false}
                    events={displayEvents}
                    eventContent={(arg) => {
                      const evt: any = arg.event;
                      const t = evt.extendedProps?.type;
                      return (
                        <div className={`px-2 py-1 rounded text-white text-xs ${colorForType(t)}`}>
                          {evt.title.length > 18 ? evt.title.slice(0, 18) + "..." : evt.title}
                        </div>
                      );
                    }}
                    datesSet={(info) => setCurrentTitle(info.view.title)}
                    dateClick={(info) => setSelectedEvent({ date: info.dateStr })}
                    eventClick={(info) => setSelectedEvent({ date: info.event.startStr })}
                    height={600}
                  />
                </div>
                {/* Modal for manual entry */}
                {showAddModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
                    <div className="bg-[var(--card-surface)] w-full max-w-md rounded shadow p-6 z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-lg font-semibold">Add Time Entry</div>
                        <button onClick={() => setShowAddModal(false)}>✕</button>
                      </div>
                      <label>Date</label>
                      <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full border rounded px-3 py-2 bg-[var(--card-bg)]" />

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <input type="time" value={manualIn} onChange={e => setManualIn(e.target.value)} className="w-full border rounded px-3 py-2 bg-[var(--card-bg)]" />
                        <input type="time" value={manualOut} onChange={e => setManualOut(e.target.value)} className="w-full border rounded px-3 py-2 bg-[var(--card-bg)]" />
                      </div>
                      <input type="text" value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="Notes..." className="w-full border rounded px-3 py-2 mt-2 bg-[var(--card-bg)]" />

                      <div className="mt-4 flex gap-3">
                        <button onClick={handleManualEntry} className="flex-1 bg-emerald-600 text-white rounded py-2">Save</button>
                        <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {/* Sidebar */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Time Clock</div>
                    {clockedIn && <div className="text-xs px-2 py-1 bg-emerald-600 rounded-full text-white animate-pulse">Clocked In</div>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!clockedIn ? (
                      <button onClick={handleClockIn} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded">Clock In</button>
                    ) : (
                      <button onClick={handleClockOut} className="flex-1 px-4 py-2 bg-red-600 text-white rounded">Clock Out</button>
                    )}
                    <button onClick={() => setShowAddModal(true)} className="px-3 py-2 border rounded bg-[var(--card-bg)]">+</button>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs text-[var(--muted)] mb-2">TODAY'S ENTRIES</div>
                    <ul className="space-y-2">
                      {timeEntries.filter(e => e.start.startsWith(new Date().toISOString().slice(0, 10))).map(e => (
                        <li key={e.id} className="flex justify-between items-center text-sm p-2 border rounded bg-[var(--card-bg)]">
                          <div>
                            {new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                            {e.end ? new Date(e.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ' ...'}
                          </div>
                          <button onClick={() => handleDeleteEntry(e.id)} className="text-red-500">✕</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4">
                  <div className="text-sm font-semibold mb-2">Upcoming Events</div>
                  <ul>
                    {events.map(e => (
                      <li key={e.id} className="text-sm flex gap-2 items-center mb-2">
                        <span className={`w-2 h-2 rounded-full ${e.extendedProps.type === 'payday' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span>{e.title}</span>
                        <span className="text-[var(--muted)] text-xs ml-auto">{new Date(e.start).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          ) : (
            <div>Annual view not implemented</div>
          )}
        </div>
      </div>
    </main>
  );
}
