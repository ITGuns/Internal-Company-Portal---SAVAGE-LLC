import { apiFetch } from './api';

// Plan upgrade requests. Only the plan SLUG is ever sent - the server resolves
// the name and price from its own catalog, so the price shown here can never be
// what the request is actually recorded at.

export type UpgradeRequestStatus =
  | 'requested'
  | 'invoiced'
  | 'paid'
  | 'fulfilled'
  | 'declined';

export interface UpgradeRequest {
  id: string;
  userId: string;
  planSlug: string;
  planName: string;
  monthlyPrice: number;
  currency: string;
  status: UpgradeRequestStatus;
  provider: string;
  externalPaymentId: string | null;
  hostedCheckoutUrl: string | null;
  paidAt: string | null;
  organizationId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; name: string | null; avatar: string | null };
  organization?: { id: string; name: string; slug: string } | null;
  handledBy?: { id: string; name: string | null; email: string } | null;
}

export const UPGRADE_REQUEST_STATUS_LABELS: Record<UpgradeRequestStatus, string> = {
  requested: 'Requested',
  invoiced: 'Invoice sent',
  paid: 'Paid',
  fulfilled: 'Account set up',
  declined: 'Declined',
};

/** File (or re-point) the signed-in user's request. */
export async function requestPlanUpgrade(planSlug: string, note?: string): Promise<UpgradeRequest> {
  const response = await apiFetch('/upgrade-requests', {
    method: 'POST',
    body: JSON.stringify({ planSlug, ...(note ? { note } : {}) }),
  });
  const data = await response.json();
  return data.request as UpgradeRequest;
}

/** The signed-in user's own requests. */
export async function fetchMyUpgradeRequests(): Promise<UpgradeRequest[]> {
  const response = await apiFetch('/upgrade-requests/mine');
  const data = await response.json();
  return Array.isArray(data?.requests) ? (data.requests as UpgradeRequest[]) : [];
}

/** Staff queue. Omit status for everything still live. */
export async function fetchUpgradeRequests(status?: string): Promise<UpgradeRequest[]> {
  const response = await apiFetch(`/upgrade-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  const data = await response.json();
  return Array.isArray(data?.requests) ? (data.requests as UpgradeRequest[]) : [];
}

export interface UpdateUpgradeRequestInput {
  status?: UpgradeRequestStatus;
  organizationId?: string | null;
  note?: string | null;
  externalPaymentId?: string | null;
  hostedCheckoutUrl?: string | null;
}

/** Staff: move a request along, or attach the client account that fulfils it. */
export async function updateUpgradeRequest(
  id: string,
  input: UpdateUpgradeRequestInput,
): Promise<UpgradeRequest> {
  const response = await apiFetch(`/upgrade-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = await response.json();
  return data.request as UpgradeRequest;
}
