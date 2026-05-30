"use client";

import { Ticket } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { ClientTicket } from "@/lib/client-portal";
import { getAdminTicketNextAction } from "@/lib/client-communication";
import {
  CLIENT_TICKET_CATEGORIES,
  CLIENT_TICKET_PRIORITIES,
  CLIENT_TICKET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

interface AdminTicketListProps {
  tickets: ClientTicket[];
  selectedTicketId?: string;
  saving: boolean;
  onSelectTicket: (ticketId: string) => void;
  onUpdateStatus: (ticket: ClientTicket, status: string) => void;
}

export default function AdminTicketList({
  tickets,
  selectedTicketId,
  saving,
  onSelectTicket,
  onUpdateStatus,
}: AdminTicketListProps) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={Ticket}
        title="No matching tickets"
        description="Adjust the filters or wait for the next client request."
      />
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => {
        const isTicketSelected = selectedTicketId === ticket.id;
        const nextAction = getAdminTicketNextAction(ticket);

        return (
          <article
            key={ticket.id}
            className={`rounded-[var(--radius-md)] border px-3 py-3 transition-colors ${isTicketSelected ? "border-[var(--accent)] bg-[var(--card-surface)]" : "border-[var(--border)]"}`}
          >
            <button
              type="button"
              onClick={() => onSelectTicket(ticket.id)}
              aria-pressed={isTicketSelected}
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{ticket.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, ticket.category)} / {getClientPortalOptionLabel(CLIENT_TICKET_PRIORITIES, ticket.priority)}
                  </div>
                  <div className="mt-2 text-xs font-medium text-[var(--foreground)]">{nextAction.label}</div>
                </div>
                <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, ticket.status)} size="sm" />
              </div>
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {CLIENT_TICKET_STATUSES.map((status) => {
                const isStatusSelected = ticket.status === status.value;

                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => onUpdateStatus(ticket, status.value)}
                    disabled={isStatusSelected || saving}
                    aria-pressed={isStatusSelected}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${isStatusSelected ? "border-[var(--accent)] bg-[var(--card-surface)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
