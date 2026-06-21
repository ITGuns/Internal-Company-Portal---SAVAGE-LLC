import type { ClientProject, ClientTicket, ClientTicketComment } from "./client-portal";
import type { User } from "./users";

export interface ClientTicketNextAction {
  label: string;
  description: string;
  status: "team" | "client" | "complete";
}

export interface ClientTicketSlaState {
  label: string;
  description: string;
  tone: "ok" | "warning" | "danger" | "complete";
}

const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  low: 120,
  normal: 72,
  high: 48,
  urgent: 24,
};

export function getClientVisibleComments(ticket: ClientTicket): ClientTicketComment[] {
  return (ticket.comments || []).filter((comment) => comment.visibility !== "internal");
}

export function getLastClientVisibleComment(ticket: ClientTicket): ClientTicketComment | null {
  const comments = getClientVisibleComments(ticket);
  return comments.length ? comments[comments.length - 1] : null;
}

export function getClientTicketAssigneeName(ticket: ClientTicket, users: User[] = []): string {
  if (!ticket.assignedToId) return "Unassigned";

  const assignee = users.find((user) => String(user.id) === String(ticket.assignedToId));
  return assignee?.name || assignee?.email || "Unknown staff";
}

export function getClientTicketProjectName(ticket: ClientTicket, projects: ClientProject[] = []): string {
  if (!ticket.projectId) return "No linked project";

  const project = projects.find((item) => item.id === ticket.projectId);
  return project?.name || "Unknown project";
}

export function getClientTicketSlaState(
  ticket: ClientTicket,
  now: Date = new Date(),
): ClientTicketSlaState {
  if (ticket.status === "done") {
    return {
      label: "Complete",
      description: "Closed request",
      tone: "complete",
    };
  }

  const targetHours = SLA_HOURS_BY_PRIORITY[ticket.priority] || SLA_HOURS_BY_PRIORITY.normal;
  const clockSource = ticket.updatedAt || ticket.createdAt;
  const clockStart = clockSource ? new Date(clockSource) : null;
  if (!clockStart || Number.isNaN(clockStart.getTime())) {
    return {
      label: "SLA pending",
      description: `Target: ${targetHours}h`,
      tone: "ok",
    };
  }

  const elapsedHours = Math.max(0, (now.getTime() - clockStart.getTime()) / 36e5);
  const remainingHours = Math.ceil(targetHours - elapsedHours);
  if (remainingHours <= 0) {
    return {
      label: "Overdue",
      description: `${Math.abs(remainingHours)}h past target`,
      tone: "danger",
    };
  }

  if (elapsedHours / targetHours >= 0.75) {
    return {
      label: "Due soon",
      description: `${remainingHours}h remaining`,
      tone: "warning",
    };
  }

  return {
    label: "On track",
    description: `${remainingHours}h remaining`,
    tone: "ok",
  };
}

export function getClientTicketNextAction(
  ticket: ClientTicket,
  currentUserId?: string | number | null,
): ClientTicketNextAction {
  if (ticket.status === "done") {
    return {
      label: "Completed",
      description: "The team marked this request complete.",
      status: "complete",
    };
  }

  const lastComment = getLastClientVisibleComment(ticket);
  if (!lastComment) {
    return {
      label: "Waiting on team",
      description: "The request is in the queue for the next team reply.",
      status: "team",
    };
  }

  if (currentUserId !== undefined && currentUserId !== null && lastComment.authorId === String(currentUserId)) {
    return {
      label: "Waiting on team",
      description: "Your latest message is visible to the team.",
      status: "team",
    };
  }

  return {
    label: "Client review",
    description: "Review the latest reply and send approval or changes.",
    status: "client",
  };
}

export function getAdminTicketNextAction(ticket: ClientTicket): ClientTicketNextAction {
  if (ticket.status === "done") {
    return {
      label: "Completed",
      description: "The request is closed unless the client reopens it.",
      status: "complete",
    };
  }

  if (!ticket.assignedToId) {
    return {
      label: "Assign service staff",
      description: "Choose an owner so status, SLA follow-up, and client replies have a clear path.",
      status: "team",
    };
  }

  const lastComment = getLastClientVisibleComment(ticket);
  if (!lastComment) {
    return {
      label: "Reply to client",
      description: "Send a client-visible reply so the request has a clear next step.",
      status: "team",
    };
  }

  if (ticket.createdById && lastComment.authorId === ticket.createdById) {
    return {
      label: "Team response needed",
      description: "The client sent the latest visible message.",
      status: "team",
    };
  }

  return {
    label: "Waiting on client",
    description: "The latest visible reply is from the team.",
    status: "client",
  };
}
