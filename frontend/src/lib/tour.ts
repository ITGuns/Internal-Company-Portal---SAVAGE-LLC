import { apiFetch } from './api';

// Guided-tour progress. Server-backed and per account, so a client who signs in
// on their phone is not taught the portal a second time.

export async function fetchSeenTours(): Promise<string[]> {
  const response = await apiFetch('/tour');
  const data = await response.json();
  return Array.isArray(data?.seen) ? (data.seen as string[]) : [];
}

/** Idempotent - replaying it is a no-op server-side. */
export async function markTourSeen(key: string): Promise<void> {
  await apiFetch(`/tour/${encodeURIComponent(key)}/seen`, { method: 'POST' });
}

/** Replay everything, for "show me the guide again". */
export async function resetTours(): Promise<void> {
  await apiFetch('/tour', { method: 'DELETE' });
}

export interface TourStep {
  /**
   * CSS selector for the element to spotlight, e.g. '[data-tour-panel="Action Queue"]'
   * or '#submit-request'. Omit for a centred step with no target.
   *
   * A step whose selector matches nothing is skipped rather than shown, because a
   * new client's portal is mostly empty and half these targets will not exist yet.
   */
  selector?: string;
  title: string;
  body: string;
}

export interface TourDefinition {
  /** Dot-namespaced, must satisfy the server's key pattern. */
  key: string;
  steps: TourStep[];
}
