import { apiFetch } from './api';

// Timesheet adjustment requests.
//
// Staff no longer edit their own clock-in/out; they ask, with a reason, and the
// person who manages them decides. These are the calls behind that.

export type AdjustmentStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export interface TimesheetAdjustmentRequest {
  id: string;
  userId: string;
  timeEntryId: string | null;
  requestedStart: string;
  requestedEnd: string | null;
  /** What the entry said when the request was raised, kept so the record still reads right. */
  originalStart: string | null;
  originalEnd: string | null;
  reason: string;
  status: AdjustmentStatus;
  decidedById: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; email: string; avatar: string | null };
  decidedBy?: { id: string; name: string | null; email: string } | null;
  timeEntry?: { id: string; start: string; end: string | null } | null;
}

export const ADJUSTMENT_STATUS_LABELS: Record<AdjustmentStatus, string> = {
  pending: 'Waiting on your manager',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Withdrawn',
};

export interface CreateAdjustmentInput {
  /** Omit for a shift that was never clocked at all. */
  timeEntryId?: string | null;
  requestedStart: string;
  requestedEnd?: string | null;
  reason: string;
}

export async function submitAdjustmentRequest(
  input: CreateAdjustmentInput,
): Promise<TimesheetAdjustmentRequest> {
  const res = await apiFetch('/payroll/adjustments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await res.json();
  return data.request as TimesheetAdjustmentRequest;
}

/** Your own requests. */
export async function fetchMyAdjustmentRequests(): Promise<TimesheetAdjustmentRequest[]> {
  const res = await apiFetch('/payroll/adjustments/mine');
  const data = await res.json();
  return Array.isArray(data?.requests) ? (data.requests as TimesheetAdjustmentRequest[]) : [];
}

export async function cancelAdjustmentRequest(id: string): Promise<void> {
  await apiFetch(`/payroll/adjustments/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}

/** The reviewer queue: your direct reports, or everything if payroll-privileged. */
export async function fetchAdjustmentQueue(status?: AdjustmentStatus): Promise<TimesheetAdjustmentRequest[]> {
  const res = await apiFetch(`/payroll/adjustments${status ? `?status=${status}` : ''}`);
  const data = await res.json();
  return Array.isArray(data?.requests) ? (data.requests as TimesheetAdjustmentRequest[]) : [];
}

export async function fetchAdjustmentPendingCount(): Promise<number> {
  const res = await apiFetch('/payroll/adjustments/pending-count');
  const data = await res.json();
  return typeof data?.count === 'number' ? data.count : 0;
}

export async function decideAdjustmentRequest(
  id: string,
  status: 'approved' | 'declined',
  decisionNote?: string,
): Promise<TimesheetAdjustmentRequest> {
  const res = await apiFetch(`/payroll/adjustments/${encodeURIComponent(id)}/decide`, {
    method: 'POST',
    body: JSON.stringify({ status, ...(decisionNote ? { decisionNote } : {}) }),
  });
  const data = await res.json();
  return data.request as TimesheetAdjustmentRequest;
}

/** "9:00 AM, 1 Aug" — short, unambiguous, no seconds. */
export function formatAdjustmentTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}
