"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare, RotateCcw } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/Button";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import { useToast } from "@/components/ToastProvider";
import { canClientRespondToApproval, getClientApprovalResponseError } from "@/lib/client-approval-actions";
import { buildClientCommandCenter } from "@/lib/client-portal-command";
import { ClientApproval, ClientTicket, respondClientApproval } from "@/lib/client-portal";
import {
  CLIENT_APPROVAL_STATUSES,
  CLIENT_TICKET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { formatClientPortalDate } from "@/lib/client-portal-display";

const textareaClass = "min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function isApprovalRecord(item: ClientApproval | ClientTicket): item is ClientApproval {
  return "dueAt" in item;
}

function ApprovalCard({
  item,
  savingId,
  onRespond,
}: {
  item: ClientApproval | ClientTicket;
  savingId: string;
  onRespond: (approval: ClientApproval, status: "approved" | "changes_requested", responseNote: string) => Promise<void>;
}) {
  const [responseNote, setResponseNote] = useState("");
  const isApproval = isApprovalRecord(item);
  const canRespond = isApproval && canClientRespondToApproval(item);
  const savingApprove = savingId === `${item.id}:approved`;
  const savingChanges = savingId === `${item.id}:changes_requested`;

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{item.title}</h3>
          <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">{item.description || "No details provided."}</p>
        </div>
        <StatusBadge
          label={getClientPortalOptionLabel(isApproval ? CLIENT_APPROVAL_STATUSES : CLIENT_TICKET_STATUSES, item.status)}
          size="sm"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>{isApproval ? `Due ${formatClientPortalDate(item.dueAt)}` : "Review request"}</span>
        <span>
          {isApproval
            ? item.decidedAt ? `Answered ${formatClientPortalDate(item.decidedAt)}` : "Awaiting decision"
            : `${item.comments?.length || 0} comments`}
        </span>
      </div>

      {isApproval && item.responseNote ? (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm">
          <div className="text-xs font-medium uppercase text-[var(--muted)]">Client response</div>
          <p className="mt-1 text-[var(--foreground)]">{item.responseNote}</p>
        </div>
      ) : null}

      {canRespond ? (
        <div className="mt-4 space-y-3">
          <textarea
            className={textareaClass}
            value={responseNote}
            onChange={(event) => setResponseNote(event.target.value)}
            placeholder="Optional for approval. Required if you need changes."
            aria-label={`Response note for ${item.title}`}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
              loading={savingApprove}
              disabled={Boolean(savingId)}
              onClick={() => onRespond(item, "approved", responseNote)}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="h-4 w-4" />}
              loading={savingChanges}
              disabled={Boolean(savingId)}
              onClick={() => onRespond(item, "changes_requested", responseNote)}
            >
              Request Changes
            </Button>
          </div>
        </div>
      ) : null}

      {"comments" in item ? (
        <div className="mt-4">
          <Link href="/client/tickets">
            <Button type="button" size="sm" variant="secondary" icon={<MessageSquare className="h-4 w-4" />}>
              Open Conversation
            </Button>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default function ClientApprovalsPage() {
  const toast = useToast();
  const [savingId, setSavingId] = useState("");

  return (
    <ClientPortalWorkspaceFrame
      title="Approvals"
      subtitle="Review work that needs approval or change requests."
    >
      {({ overview, refreshOverview }) => {
        if (!overview) return null;
        const command = buildClientCommandCenter(overview);

        async function handleRespond(
          approval: ClientApproval,
          status: "approved" | "changes_requested",
          responseNote: string,
        ) {
          const error = getClientApprovalResponseError(status, responseNote);
          if (error) {
            toast.error(error);
            return;
          }

          setSavingId(`${approval.id}:${status}`);
          try {
            await respondClientApproval(approval.id, {
              status,
              responseNote: responseNote.trim() || undefined,
            });
            toast.success(status === "approved" ? "Approval submitted" : "Change request submitted");
            await refreshOverview();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit approval response");
          } finally {
            setSavingId("");
          }
        }

        return (
          <ClientPortalPanel title="Approval Queue" icon={CheckCircle2} count={command.reviewRequests.length}>
            {command.reviewRequests.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={CheckCircle2}
                title="No approvals waiting"
                description="Items that need your review will appear here."
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {command.reviewRequests.map((item) => (
                  <ApprovalCard
                    key={item.id}
                    item={item}
                    savingId={savingId}
                    onRespond={handleRespond}
                  />
                ))}
              </div>
            )}
          </ClientPortalPanel>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
