"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarOptions } from "@fullcalendar/core";

// Re-export FullCalendar pre-configured with common plugins
// This component is meant to be loaded via next/dynamic({ ssr: false })
export default function LazyFullCalendar(props: Omit<CalendarOptions, "plugins">) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      {...props}
    />
  );
}
