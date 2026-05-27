"use client";

import { MessageSquare, Ticket } from "lucide-react";
import Link from "next/link";
import Button from "@/components/Button";
import ClientActivityTimeline from "@/components/client-portal/ClientActivityTimeline";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import { useUser } from "@/contexts/UserContext";
import type { ClientTicket } from "@/lib/client-portal";
import { getClientTicketNextAction, getClientVisibleComments } from "@/lib/client-communication";
import { formatClientPortalDate, getClientCommentAuthorLabel } from "@/lib/client-portal-display";
import {
  CLIENT_TICKET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

interface ConversationMessage {
  id: string;
  ticket: ClientTicket;
  authorLabel: string;
  body: string;
  createdAt?: string | null;
  source: "request" | "reply";
}

function buildConversationMessages(
  tickets: ClientTicket[],
  currentUserId?: string | number | null,
): ConversationMessage[] {
  return tickets
    .flatMap((ticket) => {
      const initialMessage: ConversationMessage = {
        id: `request-${ticket.id}`,
        ticket,
        authorLabel: ticket.createdById && String(currentUserId) === ticket.createdById ? "You" : "Client request",
        body: ticket.description || "Request submitted without additional details.",
        createdAt: ticket.createdAt || ticket.updatedAt,
        source: "request",
      };

      const replies = getClientVisibleComments(ticket).map((comment): ConversationMessage => ({
        id: comment.id,
        ticket,
        authorLabel: getClientCommentAuthorLabel(comment, currentUserId),
        body: comment.body,
        createdAt: comment.createdAt,
        source: "reply",
      }));

      return [initialMessage, ...replies];
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export default function ClientMessagesPage() {
  const { user } = useUser();

  return (
    <ClientPortalWorkspaceFrame
      title="Messages"
      subtitle="Client-visible conversations from requests and team replies."
    >
      {({ overview, activities }) => {
        if (!overview) return null;
        const messages = buildConversationMessages(overview.tickets, user?.id);
        const messageActivities = activities.filter((activity) => activity.type.includes("ticket"));

        return (
          <div className="space-y-5">
            <ClientPortalPanel
              title="Conversation History"
              icon={MessageSquare}
              count={messages.length}
              action={(
                <Link href="/client/tickets">
                  <Button type="button" size="sm" variant="secondary" icon={<Ticket className="h-4 w-4" />}>
                    Request Center
                  </Button>
                </Link>
              )}
            >
              {messages.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={MessageSquare}
                  title="No client-visible messages yet"
                  description="Replies and request conversations will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <article key={message.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs font-medium uppercase text-[var(--muted)]">{message.ticket.title}</div>
                            <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, message.ticket.status)} size="sm" />
                          </div>
                          <div className="mt-2 text-xs text-[var(--muted)]">
                            {message.authorLabel} / {message.source === "request" ? "Request started" : getClientTicketNextAction(message.ticket, user?.id).label}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                          <Link
                            href="/client/tickets"
                            className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
                          >
                            Open request
                          </Link>
                        </div>
                        <time className="text-xs text-[var(--muted)]" dateTime={message.createdAt || undefined}>
                          {formatClientPortalDate(message.createdAt)}
                        </time>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </ClientPortalPanel>

            <ClientPortalPanel title="Message Activity" icon={MessageSquare} count={messageActivities.length}>
              <ClientActivityTimeline activities={messageActivities} />
            </ClientPortalPanel>
          </div>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
