"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { ProductionPanel } from "@/components/workspace/ProductionWorkspace";
import {
  ADJUSTMENT_STATUS_LABELS,
  decideAdjustmentRequest,
  fetchAdjustmentQueue,
  formatAdjustmentTime,
  type TimesheetAdjustmentRequest,
} from "@/lib/timesheet-adjustments";

/**
 * The reviewer's queue for clock-in/out corrections.
 *
 * Scoping is enforced server-side, not here: a team lead's queue contains only
 * their own direct reports, and payroll-privileged reviewers see everything.
 * This component just renders whatever it is allowed to see.
 *
 * Renders nothing at all when there is nothing to review, so it can sit on a
 * shared page without becoming furniture for people who never approve anything.
 */
export default function TimesheetAdjustmentQueue() {
  const toast = useToast();
  const [requests, setRequests] = useState<TimesheetAdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setRequests(await fetchAdjustmentQueue("pending"));
    } catch {
      // Most people are not reviewers; a failure here should not shout at them.
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(request: TimesheetAdjustmentRequest, status: "approved" | "declined") {
    setBusyId(request.id);
    try {
      await decideAdjustmentRequest(request.id, status, notes[request.id]?.trim() || undefined);
      toast.success(
        status === "approved"
          ? "Approved — the timesheet has been updated"
          : "Declined — the timesheet is unchanged",
      );
      setNotes((current) => ({ ...current, [request.id]: "" }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record your decision");
    } finally {
      setBusyId(null);
    }
  }

  // Nothing to review, or not a reviewer: stay out of the way entirely.
  if (loading || requests.length === 0) return null;

  return (
    <ProductionPanel
      title="Timesheet Adjustment Requests"
      eyebrow="Waiting on you"
      icon={Clock}
      count={requests.length}
    >
      <div className="space-y-3">
        {requests.map((request) => {
          const busy = busyId === request.id;
          const isNewEntry = !request.timeEntryId;
          return (
            <article
              key={request.id}
              className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {request.user?.name || request.user?.email || "Team member"}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    Asked {formatAdjustmentTime(request.createdAt)}
                  </div>
                </div>
                <StatusBadge label={ADJUSTMENT_STATUS_LABELS[request.status]} status="pending" size="sm" />
              </div>

              {/* The change itself, stated plainly - this is what is being approved. */}
              <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--card-surface)] p-3 text-sm">
                {isNewEntry ? (
                  <div>
                    <span className="text-[var(--muted)]">Missed shift — add </span>
                    <strong>{formatAdjustmentTime(request.requestedStart)}</strong>
                    <span className="text-[var(--muted)]"> to </span>
                    <strong>{formatAdjustmentTime(request.requestedEnd)}</strong>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-[var(--muted)] line-through">
                      {formatAdjustmentTime(request.originalStart)} → {formatAdjustmentTime(request.originalEnd)}
                    </div>
                    <div className="font-semibold">
                      {formatAdjustmentTime(request.requestedStart)} → {formatAdjustmentTime(request.requestedEnd)}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm leading-6">
                <span className="text-[var(--muted)]">Reason: </span>
                {request.reason}
              </p>

              <input
                className="mt-3 min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm"
                placeholder="Note back to them (optional)"
                value={notes[request.id] || ""}
                disabled={busy}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [request.id]: event.target.value }))
                }
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => decide(request, "approved")}
                >
                  {busy ? "Saving..." : "Approve & update"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => decide(request, "declined")}
                >
                  Decline
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState variant="compact" icon={Clock} title="Nothing waiting" />
      ) : null}
    </ProductionPanel>
  );
}
