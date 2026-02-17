/**
 * Custom hook for managing calendar events (built-in, custom, hidden, aggregated)
 */

import { useMemo, useState, useEffect } from "react";
import type { TimeEntry } from "../time-entries";
import type { PayrollEvent } from "../payroll-events";
import type { EventType, CalendarEvent, PayrollStats } from "./types";
import { getLocalDateString } from "./utils";

export function useCalendarEvents(
  timeEntries: TimeEntry[],
  customEvents: PayrollEvent[]
) {
  const [hiddenBuiltInIds, setHiddenBuiltInIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        localStorage.getItem("savage-hidden-payroll-events") || "[]"
      );
    } catch {
      return [];
    }
  });

  // Save hidden built-in event IDs to localStorage
  useEffect(() => {
    localStorage.setItem(
      "savage-hidden-payroll-events",
      JSON.stringify(hiddenBuiltInIds)
    );
  }, [hiddenBuiltInIds]);

  // Built-in events (recurring paydays, holidays, deadlines)
  const builtInEvents: CalendarEvent[] = useMemo(() => {
    return [
      {
        id: "holiday-1",
        title: "Presidents' Day",
        start: "2026-02-16",
        extendedProps: {
          type: "holiday" as EventType,
          description: "Company-observed holiday.",
        },
      },
      {
        id: "deadline-1",
        title: "Timesheet Submission Due",
        start: "2026-02-20",
        extendedProps: {
          type: "deadline" as EventType,
          description: "Deadline for payroll-related tasks.",
        },
      },
      {
        id: "deadline-2",
        title: "Payroll Processing Deadline",
        start: "2026-02-25",
        extendedProps: {
          type: "deadline" as EventType,
          description: "Deadline for payroll-related tasks.",
        },
      },
      {
        id: "payday-1",
        title: "Pay Day",
        start: "2026-02-27",
        extendedProps: {
          type: "payday" as EventType,
          description: "Employees will receive their paycheck on this date.",
        },
      },
    ];
  }, []);

  // Merge built-in (excluding hidden) + custom events
  const events: CalendarEvent[] = useMemo(() => {
    const visible = builtInEvents.filter(
      (e) => !hiddenBuiltInIds.includes(e.id)
    );
    const custom = customEvents.map((e) => ({
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
    return [...visible, ...custom];
  }, [builtInEvents, customEvents, hiddenBuiltInIds]);

  // Display events including aggregated time entries
  const displayEvents: CalendarEvent[] = useMemo(() => {
    // Group time entries by date and sum total minutes
    const timeByDate = new Map<string, number>();

    timeEntries.forEach((e) => {
      const date = getLocalDateString(e.start);
      const mins =
        e.durationMin != null
          ? e.durationMin
          : e.end
            ? Math.max(
              0,
              Math.round(
                (new Date(e.end).getTime() - new Date(e.start).getTime()) /
                60000
              )
            )
            : 0;

      const currentTotal = timeByDate.get(date) || 0;
      timeByDate.set(date, currentTotal + mins);
    });

    // Create one calendar event per day with total time
    const derived = Array.from(timeByDate.entries()).map(([date, totalMins]) => {
      const title =
        totalMins >= 60 ? `${Math.round(totalMins / 60)}h` : `${totalMins}m`;
      return {
        id: `time-${date}`,
        title,
        start: date,
        extendedProps: { type: "time" as EventType },
      };
    });

    return [...events, ...derived];
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

  const hideBuiltInEvent = (builtInId: string) => {
    setHiddenBuiltInIds((prev) => [...prev, builtInId]);
  };

  return {
    builtInEvents,
    events,
    displayEvents,
    stats,
    hiddenBuiltInIds,
    hideBuiltInEvent,
  };
}
