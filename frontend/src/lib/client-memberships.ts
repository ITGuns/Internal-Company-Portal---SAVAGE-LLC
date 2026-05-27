import type { ClientMembership } from "./client-portal";

export interface ClientMembershipEdit {
  role: string;
  status: string;
}

export function getClientMembershipDisplayName(membership: ClientMembership): string {
  return membership.user?.name || membership.user?.email || "Unknown member";
}

export function getActiveClientMemberships(memberships: ClientMembership[] = []): ClientMembership[] {
  return memberships.filter((membership) => membership.status === "active");
}

export function createClientMembershipEdit(membership: ClientMembership): ClientMembershipEdit {
  return {
    role: membership.role || "client",
    status: membership.status || "active",
  };
}

export function hasClientMembershipEditChanges(
  membership: ClientMembership,
  edit: ClientMembershipEdit,
): boolean {
  return edit.role !== membership.role || edit.status !== membership.status;
}

export function buildClientMembershipUpdatePayload(
  membership: ClientMembership,
  edit: ClientMembershipEdit,
): Partial<ClientMembershipEdit> {
  const payload: Partial<ClientMembershipEdit> = {};

  if (edit.role !== membership.role) payload.role = edit.role;
  if (edit.status !== membership.status) payload.status = edit.status;

  return payload;
}
