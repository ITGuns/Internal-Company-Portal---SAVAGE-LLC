import {
  businessMinutesElapsed,
  slaState,
  slaTargetsForTier,
  type PausedInterval,
  type SlaState,
} from './gemfield-sla'

// Pure control-panel logic: the status vocabulary, the reopen rule, change classification, and the
// SLA summary. Kept Prisma-free so the state machine is unit-testable.

export const GEMFIELD_TICKET_STATUSES = [
  'new',
  'triaged',
  'in_progress',
  'waiting_on_client',
  'resolved',
  'closed',
] as const
export type GemfieldTicketStatus = (typeof GEMFIELD_TICKET_STATUSES)[number]

export const OPEN_STATUSES: ReadonlySet<string> = new Set(['new', 'triaged', 'in_progress', 'waiting_on_client'])
export const CLOSED_STATUSES: ReadonlySet<string> = new Set(['resolved', 'closed'])

export function isGemfieldTicketStatus(value: unknown): value is GemfieldTicketStatus {
  return typeof value === 'string' && (GEMFIELD_TICKET_STATUSES as readonly string[]).includes(value)
}

export const GEMFIELD_CHANGE_CLASSES = ['in_scope', 'quoted'] as const
export type GemfieldChangeClass = (typeof GEMFIELD_CHANGE_CLASSES)[number]

export function isChangeClass(value: unknown): value is GemfieldChangeClass {
  return typeof value === 'string' && (GEMFIELD_CHANGE_CLASSES as readonly string[]).includes(value)
}

/**
 * Resolve the effective target status for a move. Reopening a resolved/closed ticket into any open
 * state routes it back to `triaged` (with its full prior context), never straight to In Progress.
 */
export function resolveTargetStatus(current: string, requested: GemfieldTicketStatus): GemfieldTicketStatus {
  if (CLOSED_STATUSES.has(current) && OPEN_STATUSES.has(requested)) return 'triaged'
  return requested
}

export interface SlaSummary {
  firstResponse: SlaState
  resolution: SlaState
}

/**
 * SLA states for a ticket. The clock runs in business hours and, while the ticket is currently
 * Waiting on Client, the stretch since it entered that state is treated as paused. First-response
 * is "met" once any client-visible reply exists; resolution is "met" once the ticket is closed.
 */
export function buildSlaSummary(input: {
  createdAt: Date
  now: Date
  status: string
  updatedAt: Date
  hasClientReply: boolean
  tierName?: string | null
}): SlaSummary {
  const targets = slaTargetsForTier(input.tierName)
  const pauses: PausedInterval[] =
    input.status === 'waiting_on_client' ? [{ from: input.updatedAt, to: input.now }] : []
  const elapsed = businessMinutesElapsed(input.createdAt, input.now, pauses)
  return {
    firstResponse: slaState(elapsed, targets.firstResponseMinutes, input.hasClientReply),
    resolution: slaState(elapsed, targets.resolutionMinutes, CLOSED_STATUSES.has(input.status)),
  }
}
