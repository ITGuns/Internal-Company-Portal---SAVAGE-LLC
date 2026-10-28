/**
 * Event card component for displaying payroll calendar events
 */

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/lib/payroll-calendar/types";

interface EventCardProps {
  event: CalendarEvent;
  /** Shown only when given: PATCH / DELETE /payroll/events/:id are payroll roles only. */
  onEdit?: () => void;
  onDelete?: () => void;
}

const ICON_BUTTON =
  "p-1 rounded border bg-[var(--card-bg)] text-[var(--muted)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

export default function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  return (
    <div className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded mb-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">{event.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs px-2 py-1 rounded bg-[var(--card-surface)] text-[var(--muted)]">
                {String(event.extendedProps?.type || "").replace(/^[a-z]/, (c) =>
                  c.toUpperCase()
                )}
              </div>
              {onEdit && (
                <button
                  type="button"
                  aria-label={`Edit event ${event.title}`}
                  onClick={onEdit}
                  className={`${ICON_BUTTON} hover:bg-indigo-600`}
                >
                  <Edit2 className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label={`Delete event ${event.title}`}
                  onClick={onDelete}
                  className={`${ICON_BUTTON} hover:bg-red-600`}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-[var(--muted)] mt-2">
            {event.extendedProps?.description || "No description."}
          </div>
        </div>
      </div>
    </div>
  );
}
