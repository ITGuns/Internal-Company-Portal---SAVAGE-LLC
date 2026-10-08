/**
 * Time-entry correction (adjustment) request API client
 * (docs/payroll-time-v2-spec.md). apiFetch throws on any non-2xx response.
 */

import { apiFetch } from "./api";
import {
  buildTimeRequestQuery,
  readList,
  type RequestPerson,
  type TimeRequestListQuery,
} from "./overtime-requests";
import type { AdjustmentAction, TimeRequestStatus } from "./time-requests";

export interface AdjustmentRequest {
  id: string;
  userId: string;
  timeEntryId?: string | null;
  action: AdjustmentAction;
  proposedStart?: string | null;
  proposedEnd?: string | null;
  /** The entry's times captured when an update or delete was approved. */
  previousStart?: string | null;
  previousEnd?: string | null;
  reason: string;
  status: TimeRequestStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: RequestPerson | null;
  reviewedBy?: RequestPerson | null;
  timeEntry?: { id: string; start: string; end?: string | null } | null;
}

export interface CreateAdjustmentRequestInput {
  action: AdjustmentAction;
  timeEntryId?: string;
  proposedStart?: string;
  proposedEnd?: string;
  reason: string;
}

export async function listAdjustmentRequests(query: TimeRequestListQuery = {}): Promise<AdjustmentRequest[]> {
  const res = await apiFetch(`/payroll/adjustment-requests${buildTimeRequestQuery(query)}`);
  return readList<AdjustmentRequest>(await res.json());
}

export async function createAdjustmentRequest(input: CreateAdjustmentRequestInput): Promise<AdjustmentRequest> {
  const res = await apiFetch("/payroll/adjustment-requests", {
    method: "POST",
    body: JSON.stringify({
      action: input.action,
      timeEntryId: input.action === "create" ? undefined : input.timeEntryId,
      proposedStart: input.action === "delete" ? undefined : input.proposedStart,
      proposedEnd: input.action === "delete" ? undefined : input.proposedEnd,
      reason: input.reason.trim(),
    }),
  });
  return res.json();
}

export async function approveAdjustmentRequest(id: string, input: { note?: string } = {}): Promise<AdjustmentRequest> {
  const res = await apiFetch(`/payroll/adjustment-requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({ note: input.note?.trim() || undefined }),
  });
  return res.json();
}

export async function rejectAdjustmentRequest(id: string, input: { note?: string } = {}): Promise<AdjustmentRequest> {
  const res = await apiFetch(`/payroll/adjustment-requests/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify({ note: input.note?.trim() || undefined }),
  });
  return res.json();
}

export async function cancelAdjustmentRequest(id: string): Promise<void> {
  await apiFetch(`/payroll/adjustment-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
}
