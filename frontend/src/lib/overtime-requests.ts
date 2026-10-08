/**
 * Overtime request API client (docs/payroll-time-v2-spec.md).
 * apiFetch throws with the server's error message on any non-2xx response.
 */

import { apiFetch } from "./api";
import type { TimeRequestStatus } from "./time-requests";

export interface RequestPerson {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface OvertimeRequest {
  id: string;
  userId: string;
  workDate: string;
  /** The hours the employee asked for. Never changed by review. */
  hours: number;
  /** Set on approval; may be fewer than `hours`. Pay uses approvedHours ?? hours. */
  approvedHours?: number | null;
  reason?: string | null;
  status: TimeRequestStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: RequestPerson | null;
  reviewedBy?: RequestPerson | null;
}

export interface TimeRequestListQuery {
  status?: TimeRequestStatus;
  userId?: string;
  from?: string;
  to?: string;
}

export function buildTimeRequestQuery(query: TimeRequestListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.userId) params.set("userId", query.userId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function readList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export async function listOvertimeRequests(query: TimeRequestListQuery = {}): Promise<OvertimeRequest[]> {
  const res = await apiFetch(`/payroll/overtime-requests${buildTimeRequestQuery(query)}`);
  return readList<OvertimeRequest>(await res.json());
}

export async function createOvertimeRequest(input: {
  workDate: string;
  hours: number;
  reason?: string;
}): Promise<OvertimeRequest> {
  const res = await apiFetch("/payroll/overtime-requests", {
    method: "POST",
    body: JSON.stringify({
      workDate: input.workDate,
      hours: input.hours,
      reason: input.reason?.trim() || undefined,
    }),
  });
  return res.json();
}

export async function approveOvertimeRequest(
  id: string,
  input: { note?: string; hours?: number } = {},
): Promise<OvertimeRequest> {
  const res = await apiFetch(`/payroll/overtime-requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({
      note: input.note?.trim() || undefined,
      hours: input.hours,
    }),
  });
  return res.json();
}

export async function rejectOvertimeRequest(id: string, input: { note?: string } = {}): Promise<OvertimeRequest> {
  const res = await apiFetch(`/payroll/overtime-requests/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify({ note: input.note?.trim() || undefined }),
  });
  return res.json();
}

export async function cancelOvertimeRequest(id: string): Promise<void> {
  await apiFetch(`/payroll/overtime-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
}
