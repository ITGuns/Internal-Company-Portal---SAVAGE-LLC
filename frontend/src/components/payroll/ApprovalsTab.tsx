"use client";

/**
 * Approvals tab: overtime and time-entry correction queues for management and
 * payroll roles (docs/payroll-time-v2-spec.md).
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Check, ClipboardList, Hourglass, RefreshCw, X } from "lucide-react";
import Button from "@/components/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ToastProvider";
import {
  approveOvertimeRequest,
  listOvertimeRequests,
  rejectOvertimeRequest,
  type OvertimeRequest,
  type RequestPerson,
} from "@/lib/overtime-requests";
import {
  approveAdjustmentRequest,
  listAdjustmentRequests,
  rejectAdjustmentRequest,
  type AdjustmentRequest,
} from "@/lib/adjustment-requests";
import {
  ADJUSTMENT_ACTION_LABELS,
  PAYROLL_TIME_ZONE,
  TIME_REQUEST_STATUSES,
  TIME_REQUEST_STATUS_LABELS,
  correctionTimes,
  countPending,
  describeOvertimeHours,
  filterTimeRequests,
  isOwnRequest,
  type CorrectionTimes,
  type TimeRequestStatus,
} from "@/lib/time-requests";
import { useUser } from "@/contexts/UserContext";
import type { ReviewDecision } from "./ReviewDecisionModal";
import { fieldInputClass, fieldLabelClass } from "./form-styles";
import RequestStatusBadge from "./RequestStatusBadge";

const ReviewDecisionModal = dynamic(() => import("./ReviewDecisionModal"), { ssr: false });

type Queue = "overtime" | "corrections";
type StatusFilter = TimeRequestStatus | "all";

export interface ApprovalsPerson {
  id: string | number;
  name?: string | null;
  email?: string | null;
}

interface ApprovalsTabProps {
  people: ApprovalsPerson[];
  onPendingCountChange?: (count: number) => void;
}

interface PendingReview {
  queue: Queue;
  decision: ReviewDecision;
  id: string;
  summary: string;
  personLabel: string;
  requestedHours?: number;
}

// Payroll days and times are shown in Manila, whatever the browser timezone is.
const timeZone = PAYROLL_TIME_ZONE;
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone });

function formatDay(value?: string | null): string {
  if (!value) return "Unknown day";
  // A bare YYYY-MM-DD is that Manila day; noon keeps it on the same date.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+08:00` : value);
  return Number.isNaN(date.getTime()) ? "Unknown day" : dateFormatter.format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTimeFormatter.format(date);
}

function formatRange(start?: string | null, end?: string | null): string {
  if (!start) return "No time given";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "No time given";
  const endText = end ? timeFormatter.format(new Date(end)) : "open";
  return `${dateTimeFormatter.format(startDate)} to ${endText}`;
}

function personName(person: RequestPerson | null | undefined, fallbackId: string, people: Map<string, ApprovalsPerson>): string {
  const known = people.get(fallbackId);
  return person?.name || person?.email || known?.name || known?.email || "Unknown person";
}

function formatTimes(times: CorrectionTimes | null): string {
  return times ? formatRange(times.start, times.end) : "";
}

function describeCorrection(request: AdjustmentRequest): string {
  const { after } = correctionTimes(request);
  if (request.action === "delete") return "Remove this entry";
  if (request.action === "create") return `Add ${formatTimes(after)}`;
  return `Change to ${formatTimes(after)}`;
}

/** "Was ... Now ..." lines so a reviewed correction still shows the old and new times. */
function CorrectionTimesLines({ request }: { request: AdjustmentRequest }) {
  const { before, after } = correctionTimes(request);
  const approved = request.status === "approved";
  return (
    <>
      {before && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {approved ? "Was" : "Now"}: {formatTimes(before)}
        </p>
      )}
      <p className="mt-1 text-sm">
        {request.action === "delete"
          ? (approved ? "Entry removed" : "Remove this entry")
          : `${approved ? "Changed to" : request.action === "create" ? "Add" : "Change to"}: ${formatTimes(after)}`}
      </p>
    </>
  );
}

function QueueSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <li key={row} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-3 w-64 max-w-full" />
          <Skeleton className="mt-2 h-3 w-48 max-w-full" />
        </li>
      ))}
    </ul>
  );
}

export default function ApprovalsTab({ people, onPendingCountChange }: ApprovalsTabProps) {
  const toast = useToast();
  const idPrefix = useId();
  const { user } = useUser();
  const [queue, setQueue] = useState<Queue>("overtime");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [personFilter, setPersonFilter] = useState("");
  const [overtime, setOvertime] = useState<OvertimeRequest[]>([]);
  const [corrections, setCorrections] = useState<AdjustmentRequest[]>([]);
  const [pendingCounts, setPendingCounts] = useState({ overtime: 0, corrections: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [review, setReview] = useState<PendingReview | null>(null);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [String(person.id), person])),
    [people],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const query = {
      status: statusFilter === "all" ? undefined : statusFilter,
      userId: personFilter || undefined,
    };
    try {
      const [overtimeRows, correctionRows, pendingOvertime, pendingCorrections] = await Promise.all([
        listOvertimeRequests(query),
        listAdjustmentRequests(query),
        statusFilter === "pending" && !personFilter ? null : listOvertimeRequests({ status: "pending" }),
        statusFilter === "pending" && !personFilter ? null : listAdjustmentRequests({ status: "pending" }),
      ]);
      setOvertime(overtimeRows);
      setCorrections(correctionRows);
      setPendingCounts({
        overtime: countPending(pendingOvertime ?? overtimeRows),
        corrections: countPending(pendingCorrections ?? correctionRows),
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, personFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && !loadError) onPendingCountChange?.(pendingCounts.overtime + pendingCounts.corrections);
  }, [loading, loadError, pendingCounts, onPendingCountChange]);

  const filter = { status: statusFilter, userId: personFilter || undefined };
  const visibleOvertime = filterTimeRequests(overtime, filter);
  const visibleCorrections = filterTimeRequests(corrections, filter);

  const personOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of people) map.set(String(person.id), person.name || person.email || "Unknown person");
    for (const request of [...overtime, ...corrections]) {
      if (!map.has(request.userId)) map.set(request.userId, personName(request.user, request.userId, peopleById));
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [people, overtime, corrections, peopleById]);

  async function handleConfirm(input: { note?: string; hours?: number }): Promise<boolean> {
    if (!review) return false;
    try {
      if (review.queue === "overtime") {
        if (review.decision === "approve") await approveOvertimeRequest(review.id, input);
        else await rejectOvertimeRequest(review.id, { note: input.note });
      } else if (review.decision === "approve") {
        await approveAdjustmentRequest(review.id, { note: input.note });
      } else {
        await rejectAdjustmentRequest(review.id, { note: input.note });
      }
      toast.success(review.decision === "approve" ? "Request approved." : "Request rejected.");
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the decision.");
      return false;
    }
  }

  const tabs: Array<{ id: Queue; label: string; count: number }> = [
    { id: "overtime", label: "Overtime", count: pendingCounts.overtime },
    { id: "corrections", label: "Corrections", count: pendingCounts.corrections },
  ];
  const visibleCount = queue === "overtime" ? visibleOvertime.length : visibleCorrections.length;

  function renderActions(
    request: { status: string; userId: string },
    base: Omit<PendingReview, "decision">,
  ) {
    if (request.status !== "pending") return null;
    // The server refuses self-review; do not offer it.
    if (isOwnRequest(request, user?.id)) {
      return <p className="text-sm text-[var(--muted)]">Your own request</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="success"
          icon={<Check className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setReview({ ...base, decision: "approve" })}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          icon={<X className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setReview({ ...base, decision: "reject" })}
        >
          Reject
        </Button>
      </div>
    );
  }

  function renderReviewNote(request: { status: string; reviewNote?: string | null; reviewedAt?: string | null; reviewedBy?: RequestPerson | null }) {
    if (request.status === "pending") return null;
    const reviewer = request.reviewedBy?.name || request.reviewedBy?.email;
    const when = formatDateTime(request.reviewedAt);
    return (
      <p className="mt-2 text-xs text-[var(--muted)]">
        {reviewer ? `Reviewed by ${reviewer}` : "Reviewed"}
        {when ? ` on ${when}` : ""}
        {request.reviewNote ? `. Note: ${request.reviewNote}` : ""}
      </p>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby={`${idPrefix}-heading`}>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 id={`${idPrefix}-heading`} className="text-lg font-semibold">Approvals</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Overtime is not paid until approved. Approved corrections update the time entry and add a correction note.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <div className="min-w-0">
              <label htmlFor={`${idPrefix}-status`} className={fieldLabelClass}>Status</label>
              <select
                id={`${idPrefix}-status`}
                className={fieldInputClass}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                {TIME_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>{TIME_REQUEST_STATUS_LABELS[status]}</option>
                ))}
                <option value="all">All</option>
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor={`${idPrefix}-person`} className={fieldLabelClass}>Person</label>
              <select
                id={`${idPrefix}-person`}
                className={fieldInputClass}
                value={personFilter}
                onChange={(event) => setPersonFilter(event.target.value)}
              >
                <option value="">Everyone</option>
                {personOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Request queues">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={queue === tab.id}
              aria-controls={`${idPrefix}-panel`}
              onClick={() => setQueue(tab.id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                queue === tab.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]"
              }`}
            >
              {tab.id === "overtime"
                ? <Hourglass className="h-4 w-4" aria-hidden="true" />
                : <ClipboardList className="h-4 w-4" aria-hidden="true" />}
              {tab.label}
              {tab.count > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                  <span className="sr-only">, pending: </span>{tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${queue}`} aria-busy={loading}>
        {loading ? (
          <QueueSkeleton />
        ) : loadError ? (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Could not load requests.</div>
                <div className="mt-1 break-words text-[var(--muted)]">{loadError}</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void load()}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        ) : visibleCount === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-6 text-center text-sm text-[var(--muted)]">
            {statusFilter === "pending"
              ? `No ${queue === "overtime" ? "overtime" : "correction"} requests are waiting for review.`
              : `No ${queue === "overtime" ? "overtime" : "correction"} requests match these filters.`}
          </div>
        ) : queue === "overtime" ? (
          <ul className="space-y-3">
            {visibleOvertime.map((request) => {
              const name = personName(request.user, request.userId, peopleById);
              const summary = `${request.hours} hours on ${formatDay(request.workDate)}`;
              return (
                <li key={request.id} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{name}</span>
                        <RequestStatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 text-sm">
                        <span className="font-mono tabular-nums">{describeOvertimeHours(request)}</span> on {formatDay(request.workDate)}
                      </p>
                      {request.reason && (
                        <p className="mt-1 break-words text-sm text-[var(--muted)]">{request.reason}</p>
                      )}
                      <p className="mt-1 text-xs text-[var(--muted)]">Sent {formatDateTime(request.createdAt)}</p>
                      {renderReviewNote(request)}
                    </div>
                    {renderActions(request, {
                      queue: "overtime",
                      id: request.id,
                      summary,
                      personLabel: name,
                      requestedHours: request.hours,
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="space-y-3">
            {visibleCorrections.map((request) => {
              const name = personName(request.user, request.userId, peopleById);
              const summary = describeCorrection(request);
              return (
                <li key={request.id} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{name}</span>
                        <RequestStatusBadge status={request.status} />
                        <span className="text-xs text-[var(--muted)]">{ADJUSTMENT_ACTION_LABELS[request.action] || request.action}</span>
                      </div>
                      <CorrectionTimesLines request={request} />
                      <p className="mt-1 break-words text-sm text-[var(--muted)]">{request.reason}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Sent {formatDateTime(request.createdAt)}</p>
                      {renderReviewNote(request)}
                    </div>
                    {renderActions(request, {
                      queue: "corrections",
                      id: request.id,
                      summary,
                      personLabel: name,
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {review && (
        <ReviewDecisionModal
          isOpen
          decision={review.decision}
          summary={review.summary}
          personLabel={review.personLabel}
          requestedHours={review.queue === "overtime" ? review.requestedHours : undefined}
          onClose={() => setReview(null)}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  );
}
