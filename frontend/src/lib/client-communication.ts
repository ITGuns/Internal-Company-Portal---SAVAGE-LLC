import type { ClientTicket, ClientTicketComment } from "./client-portal";

export interface ClientTicketNextAction {
  label: string;
  description: string;
  status: "team" | "client" | "complete";
}

export function getClientVisibleComments(ticket: ClientTicket): ClientTicketComment[] {
  return (ticket.comments || []).filter((comment) => comment.visibility !== "internal");
}

export function getLastClientVisibleComment(ticket: ClientTicket): ClientTicketComment | null {
  const comments = getClientVisibleComments(ticket);
  return comments.length ? comments[comments.length - 1] : null;
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
