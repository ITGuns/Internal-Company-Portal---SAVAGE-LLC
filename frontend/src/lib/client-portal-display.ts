import type { ClientTicketComment } from "./client-portal";

export function formatClientPortalDate(value?: string | null): string {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getClientCommentAuthorLabel(comment: ClientTicketComment, currentUserId?: string | number | null): string {
  if (comment.visibility === "internal") return "Internal note";
  if (currentUserId !== undefined && currentUserId !== null && comment.authorId === String(currentUserId)) return "You";
  return comment.author?.name || comment.author?.email || "Team";
}
