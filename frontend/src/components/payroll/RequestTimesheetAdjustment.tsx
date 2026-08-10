"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilLine } from "lucide-react";
import Button from "@/components/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { ProductionPanel } from "@/components/workspace/ProductionWorkspace";
import {
  ADJUSTMENT_STATUS_LABELS,
  cancelAdjustmentRequest,
  fetchMyAdjustmentRequests,
  formatAdjustmentTime,
  submitAdjustmentRequest,
  type TimesheetAdjustmentRequest,
} from "@/lib/timesheet-adjustments";

/** <input type="datetime-local"> wants local time with no zone or seconds. */
function toLocalInput(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const statusTone: Record<string, "pending" | "completed" | "blocked"> = {
  pending: "pending",
  approved: "completed",
  declined: "blocked",
  cancelled: "blocked",
};

/**
 * How a staff member gets a clock-in/out corrected now that they cannot edit it
 * themselves: state the times, say why, and their manager decides.
 *
 * The reason is required by the server, not merely encouraged. It is the entire
 * reason this flow exists - an unexplained correction is the thing it replaces.
 */
export default function RequestTimesheetAdjustment({
  timeEntryId,
  currentStart,
  currentEnd,
}: {
  /** Omit for a shift that was never clocked at all. */
  timeEntryId?: string | null;
  currentStart?: string | null;
  currentEnd?: string | null;
}) {
  const toast = useToast();
  const [start, setStart] = useState(() => toLocalInput(currentStart));
  const [end, setEnd] = useState(() => (currentEnd ? toLocalInput(currentEnd) : ""));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<TimesheetAdjustmentRequest[]>([]);

  const load = useCallback(async () => {
    try {
      setMine(await fetchMyAdjustmentRequests());
    } catch {
      setMine([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setSaving(true);
    try {
      await submitAdjustmentRequest({
        timeEntryId: timeEntryId || null,
        // datetime-local has no zone, so it is read as local time - which is what
        // the person typing it means.
        requestedStart: new Date(start).toISOString(),
        requestedEnd: end ? new Date(end).toISOString() : null,
        reason,
      });
      toast.success("Sent to your manager");
      setReason("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    } finally {
      setSaving(false);
    }
  }

  const open = mine.filter((request) => request.status === "pending");

  return (
    <ProductionPanel title="Fix a Clock-In or Clock-Out" icon={PencilLine} count={open.length || undefined}>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Clock-in and clock-out times can&apos;t be edited directly. Say what they should be and why,
        and your manager approves the change.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Start</span>
          <input
            type="datetime-local"
            className="mt-1 min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm"
            value={start}
            disabled={saving}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">End</span>
          <input
            type="datetime-local"
            className="mt-1 min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm"
            value={end}
            disabled={saving}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-[var(--muted)]">Why does it need changing?</span>
        <textarea
          rows={3}
          className="mt-1 min-h-20 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
          placeholder="e.g. I arrived at 8am but forgot to clock in until 9."
          value={reason}
          disabled={saving}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>

      <div className="mt-3">
        <Button type="button" onClick={submit} disabled={saving || !start || reason.trim().length < 10}>
          {saving ? "Sending..." : "Send to my manager"}
        </Button>
      </div>

      {mine.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
          <div className="text-xs font-medium uppercase text-[var(--muted)]">Your requests</div>
          {mine.slice(0, 5).map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-2.5 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {formatAdjustmentTime(request.requestedStart)} → {formatAdjustmentTime(request.requestedEnd)}
                </div>
                {request.decisionNote ? (
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    Manager said: {request.decisionNote}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={ADJUSTMENT_STATUS_LABELS[request.status]}
                  status={statusTone[request.status]}
                  size="sm"
                />
                {request.status === "pending" ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                    onClick={async () => {
                      await cancelAdjustmentRequest(request.id).catch(() => {});
                      await load();
                    }}
                  >
                    Withdraw
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </ProductionPanel>
  );
}
