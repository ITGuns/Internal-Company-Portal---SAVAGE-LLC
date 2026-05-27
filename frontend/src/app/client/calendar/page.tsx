"use client";

import { CalendarDays } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import {
  CLIENT_CALENDAR_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { formatClientPortalDate } from "@/lib/client-portal-display";

export default function ClientCalendarPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Calendar"
      subtitle="Campaign and content schedule."
    >
      {({ overview }) => {
        if (!overview) return null;
        const items = overview.calendarItems || [];

        return (
          <ClientPortalPanel title="Campaign Calendar" icon={CalendarDays} count={items.length}>
            {items.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={CalendarDays}
                title="No scheduled campaign items"
                description="Campaign and content schedule records will appear here."
              />
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{item.description || "No details provided."}</p>
                      </div>
                      <StatusBadge label={getClientPortalOptionLabel(CLIENT_CALENDAR_STATUSES, item.status)} size="sm" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                      <span>{item.channel || "General"}</span>
                      <time dateTime={item.startAt || undefined}>{formatClientPortalDate(item.startAt)}</time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ClientPortalPanel>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
