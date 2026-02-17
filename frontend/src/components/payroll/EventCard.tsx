/**
 * Event card component for displaying payroll calendar events
 */

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/lib/payroll-calendar/types";
import { bgForType, iconForType } from "@/lib/payroll-calendar/utils";

interface EventCardProps {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
}

export default function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  return (
    <div className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded mb-3">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-white ${bgForType(
            event.extendedProps?.type
          )}`}
        >
          {iconForType(event.extendedProps?.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">{event.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs px-2 py-1 rounded-full bg-[var(--card-surface)] text-[var(--muted)]">
                {String(event.extendedProps?.type || "").replace(/^[a-z]/, (c) =>
                  c.toUpperCase()
                )}
              </div>
              <button
                aria-label="Edit event"
                onClick={onEdit}
                className="p-1 rounded border bg-[var(--card-bg)] text-[var(--muted)] hover:bg-indigo-600 hover:text-white transition-colors"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                aria-label="Delete event"
                onClick={onDelete}
                className="p-1 rounded border bg-[var(--card-bg)] text-[var(--muted)] hover:bg-red-600 hover:text-white transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
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
