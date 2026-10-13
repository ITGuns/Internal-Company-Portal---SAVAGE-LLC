import React from "react";
import { TIME_REQUEST_STATUS_LABELS, type TimeRequestStatus } from "@/lib/time-requests";

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

/** Pending / Approved / Rejected pill for overtime and correction requests. */
export default function RequestStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] || STATUS_BADGE.pending}`}>
      {TIME_REQUEST_STATUS_LABELS[status as TimeRequestStatus] || status}
    </span>
  );
}
