"use client";

import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarOptions } from "@fullcalendar/core";

// Re-export FullCalendar pre-configured with common plugins
// This component is meant to be loaded via next/dynamic({ ssr: false })
export default function LazyFullCalendar(props: Omit<CalendarOptions, "plugins">) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hideDecorativeIcons = () => {
      rootRef.current
        ?.querySelectorAll<HTMLElement>(".fc-icon[role='img']")
        .forEach((icon) => {
          icon.setAttribute("aria-hidden", "true");
        });
    };

    hideDecorativeIcons();
    const observer = new MutationObserver(hideDecorativeIcons);
    if (rootRef.current) {
      observer.observe(rootRef.current, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        {...props}
      />
    </div>
  );
}
