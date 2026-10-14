/**
 * Merging polled chat messages into what the chat already shows.
 * Pure helpers with type-only imports so node --test can load this file directly.
 */
import type { Message } from './chat';

const PENDING_ID_PREFIX = 'temp-';

function isPending(message: Message): boolean {
  return message.id.startsWith(PENDING_ID_PREFIX);
}

function signature(message: Message): string {
  const reactionIds = (message.reactions ?? []).map((reaction) => reaction.id).join(',');
  return `${message.id}|${message.editedAt ?? ''}|${message.content}|${reactionIds}`;
}

function sameMessages(left: Message[], right: Message[]): boolean {
  return left.length === right.length && left.every((message, index) => signature(message) === signature(right[index]));
}

/**
 * `incoming` is the latest page from the server, oldest first, and wins for every id it holds,
 * so edits and reactions come through and ids never repeat. Messages older than that page are
 * kept (they are outside it, not deleted); messages inside it that the server no longer returns
 * were deleted. An optimistic `temp-` message stays until a newly saved copy from the same sender
 * with the same text arrives. Returns `current` itself when nothing changed, so the view does not
 * re-render or scroll.
 */
export function mergePolledMessages(current: Message[], incoming: Message[]): Message[] {
  const currentIds = new Set(current.map((message) => message.id));
  const incomingIds = new Set(incoming.map((message) => message.id));
  const pageStart = incoming.length > 0 ? Date.parse(incoming[0].createdAt) : Number.NaN;

  const older = current.filter((message) => (
    !isPending(message)
    && !incomingIds.has(message.id)
    && Date.parse(message.createdAt) < pageStart
  ));
  const newlySaved = incoming.filter((message) => !currentIds.has(message.id));
  const pending = current.filter((message) => isPending(message) && !newlySaved.some((saved) => (
    String(saved.senderId) === String(message.senderId) && saved.content === message.content
  )));

  const merged = [...older, ...incoming, ...pending];
  return sameMessages(current, merged) ? current : merged;
}

/** Swaps an optimistic message for its saved copy, unless a poll already added that copy. */
export function replacePendingMessage(current: Message[], pendingId: string, saved: Message): Message[] {
  if (current.some((message) => message.id === saved.id)) {
    return current.filter((message) => message.id !== pendingId);
  }
  return current.map((message) => (message.id === pendingId ? saved : message));
}
