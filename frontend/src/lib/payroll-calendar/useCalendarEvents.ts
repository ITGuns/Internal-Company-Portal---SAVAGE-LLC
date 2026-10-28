/**
 * Calendar events for the payroll grid: the payroll events from the API and
 * the clock-in / clock-out markers of the time entries, both on Manila days.
 */

import { useMemo } from "react";
import type { TimeEntry } from "../time-entries";
import type { PayrollEvent } from "../payroll-events";
import type { EventType, CalendarEvent, PayrollStats } from "./types";
import { formatPayrollTime, manilaDayKey } from "../payroll-dates";

export function useCalendarEvents(
  timeEntries: TimeEntry[],
  customEvents: PayrollEvent[]
) {
  // Every event comes from the API (PayrollEvent rows); there are no built-in ones.
  const events: CalendarEvent[] = useMemo(() => {
    return customEvents.map((e) => ({
      id: `custom-${e.id}`,
      title: e.title,
      start: e.date,
      extendedProps: {
        type: e.type as EventType,
        description: e.description || "",
        custom: true,
        customId: e.id,
      },
    }));
  }, [customEvents]);

  // Display events including individual clock-in/clock-out entries (permanent, non-deletable)
  const displayEvents: CalendarEvent[] = useMemo(() => {
    const sessionEvents: CalendarEvent[] = [];

    // Build per-day session grouping first, so we can add a total badge
    const dayMap = new Map<string, { entries: typeof timeEntries; totalMins: number }>();

    timeEntries.forEach((e) => {
      // The Manila day of the start, the day the server pays the entry on.
      const date = manilaDayKey(e.start);
      if (!date) return;
      const mins =
        e.durationMin != null
          ? e.durationMin
          : e.end
            ? Math.max(0, Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000))
            : 0;

      const existing = dayMap.get(date) || { entries: [], totalMins: 0 };
      existing.entries.push(e);
      existing.totalMins += mins;
      dayMap.set(date, existing);
    });

    // For each day, emit individual IN/OUT session events
    dayMap.forEach(({ entries, totalMins }, date) => {
      entries.forEach((e, idx) => {
        const sessionNum = entries.length > 1 ? ` #${idx + 1}` : "";
        const inTime = formatPayrollTime(e.start);

        // Clock-in event
        sessionEvents.push({
          id: `clockin-${e.id}`,
          title: `🟢 IN${sessionNum} ${inTime}`,
          start: date,
          extendedProps: {
            type: "time" as EventType,
            clockEntry: true,
            entryId: e.id,
            direction: "in",
          },
        });

        // Clock-out event (only if session ended)
        if (e.end) {
          const outTime = formatPayrollTime(e.end);
          sessionEvents.push({
            id: `clockout-${e.id}`,
            title: `🔴 OUT${sessionNum} ${outTime}`,
            start: date,
            extendedProps: {
              type: "time" as EventType,
              clockEntry: true,
              entryId: e.id,
              direction: "out",
            },
          });
        }
      });

      // Daily total summary (shown last, only if there's at least one completed session)
      if (totalMins > 0) {
        const totalLabel = totalMins >= 60
          ? `⏱ ${(totalMins / 60).toFixed(1)}h total`
          : `⏱ ${totalMins}m total`;
        sessionEvents.push({
          id: `totalbadge-${date}`,
          title: totalLabel,
          start: date,
          extendedProps: {
            type: "time" as EventType,
            clockEntry: true,
            direction: "total",
          },
        });
      }
    });

    return [...events, ...sessionEvents];
  }, [events, timeEntries]);

  // Calculate stats for event types
  const stats: PayrollStats = useMemo(() => {
    const payday = events.filter((e) => e.extendedProps.type === "payday")
      .length;
    const holiday = events.filter((e) => e.extendedProps.type === "holiday")
      .length;
    const deadline = events.filter((e) => e.extendedProps.type === "deadline")
      .length;
    return { payday, holiday, deadline, total: events.length };
  }, [events]);

  return {
    events,
    displayEvents,
    stats,
  };
}
