/**
 * Concerns (internal tickets): pure rules for input, access and status.
 * No database here, so the decisions are easy to read and to test.
 */

export const CONCERN_STATUSES = ['open', 'answered', 'closed'] as const
export type ConcernStatus = (typeof CONCERN_STATUSES)[number]

export const CONCERN_BOXES = ['inbox', 'sent', 'all'] as const
export type ConcernBox = (typeof CONCERN_BOXES)[number]

export const SUBJECT_MIN_LENGTH = 3
export const SUBJECT_MAX_LENGTH = 120
export const BODY_MIN_LENGTH = 1
export const BODY_MAX_LENGTH = 4000
export const SEARCH_MAX_LENGTH = 120

/** An expected refusal with the HTTP status to answer with. */
export class ConcernError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'ConcernError'
  }
}

export interface ConcernActor {
  id: string
  displayName: string
  isFullAccess: boolean
}

export interface TicketParties {
  requesterId: string
  assigneeId: string
  status: string
}

export function readSubject(value: unknown): string {
  const subject = typeof value === 'string' ? value.trim() : ''
  if (subject.length < SUBJECT_MIN_LENGTH || subject.length > SUBJECT_MAX_LENGTH) {
    throw new ConcernError(400, `Subject must be ${SUBJECT_MIN_LENGTH} to ${SUBJECT_MAX_LENGTH} characters`)
  }
  return subject
}

export function readBody(value: unknown): string {
  const body = typeof value === 'string' ? value.trim() : ''
  if (body.length < BODY_MIN_LENGTH || body.length > BODY_MAX_LENGTH) {
    throw new ConcernError(400, `Message must be ${BODY_MIN_LENGTH} to ${BODY_MAX_LENGTH} characters`)
  }
  return body
}

export function readPersonId(value: unknown, label: string): string {
  const id = typeof value === 'string' ? value.trim() : ''
  if (!id) throw new ConcernError(400, `${label} is required`)
  return id
}

export function parseBox(value: unknown): ConcernBox {
  if (value === undefined || value === '') return 'inbox'
  if (typeof value === 'string' && (CONCERN_BOXES as readonly string[]).includes(value)) {
    return value as ConcernBox
  }
  throw new ConcernError(400, 'box must be inbox, sent or all')
}

export function parseStatusFilter(value: unknown): ConcernStatus | null {
  if (value === undefined || value === '') return null
  if (typeof value === 'string' && (CONCERN_STATUSES as readonly string[]).includes(value)) {
    return value as ConcernStatus
  }
  throw new ConcernError(400, 'status must be open, answered or closed')
}

export function parseSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, SEARCH_MAX_LENGTH) : ''
}

export function isParty(ticket: TicketParties, userId: string): boolean {
  return ticket.requesterId === userId || ticket.assigneeId === userId
}

/** Requester, assignee, or a full-access admin. */
export function canViewTicket(ticket: TicketParties, actor: ConcernActor): boolean {
  return isParty(ticket, actor.id) || actor.isFullAccess
}

/** Close and reopen belong to the two people on the concern. */
export function canCloseOrReopen(ticket: TicketParties, actor: ConcernActor): boolean {
  return isParty(ticket, actor.id)
}

/** The current assignee hands it on; a full-access admin may move it too. */
export function canReassignTicket(ticket: TicketParties, actor: ConcernActor): boolean {
  return ticket.assigneeId === actor.id || actor.isFullAccess
}

/**
 * The "All" box: full access only. It lists the subject, requester and assignee
 * of every concern, and only the two people on a concern and admins may read it
 * (review fix 2026-10-28; management roles used to see the list).
 */
export function canListAllTickets(actor: ConcernActor): boolean {
  return actor.isFullAccess
}

/**
 * A reply by the assignee answers the concern; a reply by the requester puts it
 * back in the assignee's court. A reply by anyone else (a full-access admin)
 * leaves the status as it was.
 */
export function statusAfterReply(ticket: TicketParties, authorId: string): ConcernStatus {
  if (authorId === ticket.assigneeId) return 'answered'
  if (authorId === ticket.requesterId) return 'open'
  return (CONCERN_STATUSES as readonly string[]).includes(ticket.status)
    ? (ticket.status as ConcernStatus)
    : 'open'
}

/** Everyone to tell about a change: unique ids, never the person who made it. */
export function recipientsFor(userIds: Array<string | null | undefined>, actorId: string): string[] {
  return [...new Set(userIds.filter((id): id is string => Boolean(id) && id !== actorId))]
}

export function shorten(text: string, maxLength = 100): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 3).trimEnd()}...` : singleLine
}
