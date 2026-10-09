/**
 * Member status API client (docs/payroll-time-v2-spec.md rule 6).
 * Deactivate / reactivate: admin or operations_manager.
 * Hard delete: admin only, needs ?confirm=hard, 409 while the user has payslips.
 */

import { apiFetch } from "./api";
import { isInactiveMember } from "./member-status";

export interface MemberStatusResult {
  id?: string;
  status?: string;
  message?: string;
}

export interface InactiveMember {
  id: string;
  name?: string | null;
  email: string;
  avatar?: string | null;
  status?: string;
}

export async function deactivateUser(id: string): Promise<MemberStatusResult> {
  const res = await apiFetch(`/users/${encodeURIComponent(id)}/deactivate`, { method: "POST" });
  return res.json().catch(() => ({}));
}

export async function reactivateUser(id: string): Promise<MemberStatusResult> {
  const res = await apiFetch(`/users/${encodeURIComponent(id)}/reactivate`, { method: "POST" });
  return res.json().catch(() => ({}));
}

export async function hardDeleteUser(id: string): Promise<void> {
  await apiFetch(`/users/${encodeURIComponent(id)}?confirm=hard`, { method: "DELETE" });
}

/**
 * Deactivated members come from the deployed-employees list with
 * includeInactive=true (payroll v2). Only rows the server marks inactive are
 * kept, so active members never show up here.
 */
export async function fetchInactiveMembers(): Promise<InactiveMember[]> {
  const res = await apiFetch("/employees/deployed?includeInactive=true");
  const data: unknown = await res.json();
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];
  return (rows as InactiveMember[]).filter((row) => row && isInactiveMember(row.status));
}
