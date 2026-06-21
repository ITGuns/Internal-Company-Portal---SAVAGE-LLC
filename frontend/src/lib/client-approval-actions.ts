import type { ClientApproval } from "./client-portal";

const CLOSED_APPROVAL_STATUSES = new Set(["approved", "changes_requested", "rejected", "archived"]);

export function canClientRespondToApproval(approval: Pick<ClientApproval, "status" | "visibleToClient">): boolean {
  return approval.visibleToClient !== false && !CLOSED_APPROVAL_STATUSES.has(approval.status);
}

export function getClientApprovalResponseError(status: "approved" | "changes_requested", responseNote: string): string | null {
  if (status === "changes_requested" && responseNote.trim().length === 0) {
    return "Add a short note so the team knows what to revise.";
  }

  return null;
}
