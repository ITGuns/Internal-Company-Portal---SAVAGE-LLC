"use client";

/**
 * Read-only rows for overtime and correction requests: status, hours asked,
 * hours approved when different, old and new times, and the reviewer's note.
 * Used by the day panel and the "My requests" list on the payroll calendar.
 */

import React from "react";
import type { OvertimeRequest } from "@/lib/overtime-requests";
import type { AdjustmentRequest } from "@/lib/adjustment-requests";
import {
  ADJUSTMENT_ACTION_LABELS,
  PAYROLL_TIME_ZONE,
  correctionTimes,
  describeOvertimeHours,
  type CorrectionTimes,
} from "@/lib/time-requests";
import RequestStatusBadge from "./RequestStatusBadge";

const timeZone = PAYROLL_TIME_ZONE;
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone });

function formatTimes(times: CorrectionTimes | null): string {
  if (!times?.start) return "No time given";
  const end = times.end ? timeFormatter.format(new Date(times.end)) : "open";
  return `${dateTimeFormatter.format(new Date(times.start))} to ${end}`;
}

function ReviewNote({ request }: { request: { status: string; reviewNote?: string | null } }) {
  if (request.status === "pending") return <p className="mt-1 text-xs text-[var(--muted)]">Waiting for review.</p>;
  if (!request.reviewNote) return null;
  return <p className="mt-1 break-words text-xs text-[var(--muted)]">Reviewer note: {request.reviewNote}</p>;
}

export function OvertimeRequestItem({ request, showDay = true }: { request: OvertimeRequest; showDay?: boolean }) {
  return (
    <li className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Overtime</span>
        <RequestStatusBadge status={request.status} />
        {showDay && <span className="text-xs text-[var(--muted)]">{dayFormatter.format(new Date(request.workDate))}</span>}
      </div>
      <p className="mt-1 text-sm">{describeOvertimeHours(request)}</p>
      {request.status === "rejected" && <p className="mt-1 text-xs text-[var(--muted)]">Not paid.</p>}
      <ReviewNote request={request} />
    </li>
  );
}

export function CorrectionRequestItem({ request }: { request: AdjustmentRequest }) {
  const { before, after } = correctionTimes(request);
  const approved = request.status === "approved";
  return (
    <li className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{ADJUSTMENT_ACTION_LABELS[request.action] || "Correction"}</span>
        <RequestStatusBadge status={request.status} />
      </div>
      {before && <p className="mt-1 text-xs text-[var(--muted)]">{approved ? "Was" : "Now"}: {formatTimes(before)}</p>}
      {after && <p className="mt-1 text-sm">{approved ? "Changed to" : "Asked for"}: {formatTimes(after)}</p>}
      {request.action === "delete" && <p className="mt-1 text-sm">{approved ? "Entry removed" : "Asked to remove this entry"}</p>}
      <ReviewNote request={request} />
    </li>
  );
}
