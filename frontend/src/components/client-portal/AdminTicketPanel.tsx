"use client";

import { MessageSquare, Send, Ticket } from "lucide-react";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  ClientTicket,
} from "@/lib/client-portal";
import { getAdminTicketNextAction } from "@/lib/client-communication";
import {
  CLIENT_ADMIN_TICKET_REPLIES,
  CLIENT_ADMIN_TICKET_VISIBILITY_OPTIONS,
  CLIENT_TICKET_CATEGORIES,
  CLIENT_TICKET_PRIORITIES,
  CLIENT_TICKET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { formatClientPortalDate, getClientCommentAuthorLabel } from "@/lib/client-portal-display";

const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

interface AdminTicketPanelProps {
  ticket: ClientTicket | null;
  currentUserId?: string | number | null;
  replyForm: {
    body: string;
    visibility: string;
  };
  saving: boolean;
  onReplyFormChange: (form: { body: string; visibility: string }) => void;
  onSubmitReply: (event: React.FormEvent) => void;
}

export default function AdminTicketPanel({
  ticket,
  currentUserId,
  replyForm,
  saving,
  onReplyFormChange,
  onSubmitReply,
}: AdminTicketPanelProps) {
  if (!ticket) {
    return (
      <EmptyState
        variant="compact"
        icon={Ticket}
        title="Select a ticket"
        description="Ticket details, replies, and internal notes will appear here."
      />
    );
  }

  const nextAction = getAdminTicketNextAction(ticket);

  return (
    <div className="space-y-5 border-t border-[var(--border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium uppercase text-[var(--muted)]">Next action</div>
            <div className="mt-1 text-sm font-semibold">{nextAction.label}</div>
          </div>
          <StatusBadge label={nextAction.status === "client" ? "Client" : nextAction.status === "complete" ? "Done" : "Team"} size="sm" />
        </div>
        <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{nextAction.description}</p>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, ticket.status)} size="sm" />
          <span>{getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, ticket.category)}</span>
          <span>{getClientPortalOptionLabel(CLIENT_TICKET_PRIORITIES, ticket.priority)}</span>
          <span>{ticket.comments?.length || 0} comments</span>
        </div>
        <h3 className="mt-3 text-base font-semibold leading-snug">{ticket.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
          {ticket.description || "No description provided."}
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
          Conversation
        </div>
        {ticket.comments?.length ? (
          <div className="space-y-3">
            {ticket.comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <span>{getClientCommentAuthorLabel(comment, currentUserId)}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
                      {comment.visibility === "internal" ? "Internal" : "Client"}
                    </span>
                    <time dateTime={comment.createdAt || undefined}>{formatClientPortalDate(comment.createdAt)}</time>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState variant="compact" icon={MessageSquare} title="No conversation yet" description="Add the first client reply or internal note." />
        )}
      </div>

      <form onSubmit={onSubmitReply} className="space-y-3">
        <div>
          <div className="mb-2 text-sm font-medium">Reply visibility</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CLIENT_ADMIN_TICKET_VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={replyForm.visibility === option.value}
                onClick={() => onReplyFormChange({ ...replyForm, visibility: option.value })}
                className={`rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${replyForm.visibility === option.value ? "border-[var(--accent)] bg-[var(--card-surface)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs leading-4 text-[var(--muted)]">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {CLIENT_ADMIN_TICKET_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => onReplyFormChange({ ...replyForm, body: reply })}
              className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-left text-xs font-medium leading-5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {reply}
            </button>
          ))}
        </div>

        <textarea
          className={textareaClass}
          value={replyForm.body}
          onChange={(event) => onReplyFormChange({ ...replyForm, body: event.target.value })}
          placeholder={replyForm.visibility === "internal" ? "Add an internal note for the team." : "Send a reply the client can see."}
          aria-label="Admin ticket reply"
        />

        <Button
          type="submit"
          icon={<Send className="h-4 w-4" />}
          loading={saving}
          disabled={!replyForm.body.trim() || saving}
        >
          {replyForm.visibility === "internal" ? "Save Internal Note" : "Send Client Reply"}
        </Button>
      </form>
    </div>
  );
}
