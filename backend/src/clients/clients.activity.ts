import { Prisma, type PrismaClient } from '@prisma/client'

export const CLIENT_ACTIVITY_VISIBILITIES = ['internal', 'client'] as const
export type ClientActivityVisibility = typeof CLIENT_ACTIVITY_VISIBILITIES[number]

export const CLIENT_ACTIVITY_TYPES = {
  ticketCreated: 'ticket_created',
  ticketClientReplyCreated: 'ticket_client_reply_created',
  ticketInternalNoteCreated: 'ticket_internal_note_created',
  ticketUpdated: 'ticket_updated',
  ticketDeleted: 'ticket_deleted',
  ticketStatusChanged: 'ticket_status_changed',
  workItemCreated: 'work_item_created',
  workItemUpdated: 'work_item_updated',
  workItemCompleted: 'work_item_completed',
  approvalRequested: 'approval_requested',
  approvalApproved: 'approval_approved',
  approvalChangesRequested: 'approval_changes_requested',
  reportCreated: 'report_created',
  reportPublished: 'report_published',
  roadmapUpdated: 'roadmap_updated',
  assetUpdated: 'asset_updated',
  billingUpdated: 'billing_updated',
  calendarScheduled: 'calendar_scheduled',
  calendarUpdated: 'calendar_updated',
  calendarDeleted: 'calendar_deleted',
  organizationArchived: 'organization_archived',
  organizationRestored: 'organization_restored',
  membershipUpdated: 'membership_updated',
} as const

export type ClientActivityType = typeof CLIENT_ACTIVITY_TYPES[keyof typeof CLIENT_ACTIVITY_TYPES]

export interface CreateClientActivityInput {
  organizationId: string
  actorId?: string | null
  type: ClientActivityType
  subjectType: string
  subjectId?: string | null
  visibility: ClientActivityVisibility
  title: string
  body?: string | null
  metadata?: Record<string, unknown> | null
}

export const CLIENT_ACTION_QUEUE_CATEGORIES = [
  'team_response_needed',
  'client_response_needed',
  'approval_needed',
  'work_due_soon',
  'report_ready',
  'recently_completed',
] as const

export type ClientActionQueueCategory = typeof CLIENT_ACTION_QUEUE_CATEGORIES[number]
export type ClientActionQueueAudience = 'management' | 'client'

export interface ClientActionQueueItem {
  id: string
  organizationId: string
  organizationName: string
  category: ClientActionQueueCategory
  title: string
  summary: string
  subjectType: string
  subjectId: string
  priority: string
  dueAt: Date | string | null
  href: string
  visibility: ClientActivityVisibility
}

const CLOSED_TICKET_STATUSES = new Set(['done', 'closed', 'archived'])
const ACTIVE_WORK_ITEM_STATUSES = new Set(['open', 'in_progress', 'review', 'blocked'])
const COMPLETED_WORK_ITEM_STATUSES = new Set(['completed', 'done'])
const DUE_SOON_MS = 7 * 24 * 60 * 60 * 1000
const RECENT_COMPLETION_MS = 14 * 24 * 60 * 60 * 1000

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().replace(/[\s-]+/g, '_') : ''
}

function getCommentAuthorRoles(comment: any): string[] {
  const directRole = normalizeRole(comment?.author?.role)
  const roleRecords = Array.isArray(comment?.author?.roles) ? comment.author.roles : []
  const membershipRecords = Array.isArray(comment?.author?.clientMemberships) ? comment.author.clientMemberships : []
  const roles = [...roleRecords, ...membershipRecords]
    .map((roleRecord: any) => normalizeRole(roleRecord?.role || roleRecord))
    .filter(Boolean)

  return [directRole, ...roles].filter(Boolean)
}

function isClientAuthoredComment(comment: any): boolean {
  return getCommentAuthorRoles(comment).some((role) => role.includes('client'))
}

function getQueueHref(
  audience: ClientActionQueueAudience,
  organizationId: string,
  managementRoute: string,
  clientRoute: string,
): string {
  if (audience === 'client') return clientRoute
  return `${managementRoute}?client=${encodeURIComponent(organizationId)}`
}

function isDueSoon(value: Date | string | null | undefined, now = new Date()): boolean {
  if (!value) return false
  const dueAt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dueAt.getTime())) return false
  return dueAt.getTime() <= now.getTime() + DUE_SOON_MS
}

function isRecentlyCompleted(value: Date | string | null | undefined, now = new Date()): boolean {
  if (!value) return false
  const completedAt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(completedAt.getTime())) return false
  return completedAt.getTime() >= now.getTime() - RECENT_COMPLETION_MS
}

export function normalizeClientActivityVisibility(value: string | undefined | null): ClientActivityVisibility {
  return value === 'client' ? 'client' : 'internal'
}

export async function createClientActivity(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: CreateClientActivityInput,
) {
  return prisma.clientActivity.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId || null,
      type: input.type,
      subjectType: input.subjectType,
      subjectId: input.subjectId || null,
      visibility: input.visibility,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      metadata: input.metadata ? input.metadata as Prisma.InputJsonObject : undefined,
    },
  })
}

export function buildTicketQueueItems(
  ticket: any,
  organizationName: string,
  audience: ClientActionQueueAudience = 'management',
): ClientActionQueueItem[] {
  if (CLOSED_TICKET_STATUSES.has(ticket.status)) return []

  const comments = Array.isArray(ticket.comments) ? ticket.comments : []
  const visibleComments = comments.filter((comment: any) => comment.visibility === 'client')
  const latestVisible = visibleComments[visibleComments.length - 1]
  const latestFromClient = latestVisible ? isClientAuthoredComment(latestVisible) : true
  const category: ClientActionQueueCategory = latestFromClient ? 'team_response_needed' : 'client_response_needed'

  return [{
    id: `ticket:${ticket.id}:${category}`,
    organizationId: ticket.organizationId,
    organizationName,
    category,
    title: ticket.title,
    summary: latestVisible?.body || ticket.description || 'Request needs attention.',
    subjectType: 'ticket',
    subjectId: ticket.id,
    priority: ticket.priority || 'normal',
    dueAt: null,
    href: getQueueHref(audience, ticket.organizationId, '/operations/clients/requests', '/client/messages'),
    visibility: category === 'client_response_needed' ? 'client' : 'internal',
  }]
}

export function buildApprovalQueueItems(
  approval: any,
  organizationName: string,
  audience: ClientActionQueueAudience = 'management',
): ClientActionQueueItem[] {
  if (approval.status !== 'pending' || !approval.visibleToClient) return []

  return [{
    id: `approval:${approval.id}:approval_needed`,
    organizationId: approval.organizationId,
    organizationName,
    category: 'approval_needed',
    title: approval.title,
    summary: approval.description || 'Client approval is pending.',
    subjectType: 'approval',
    subjectId: approval.id,
    priority: isDueSoon(approval.dueAt) ? 'high' : 'normal',
    dueAt: approval.dueAt || null,
    href: getQueueHref(audience, approval.organizationId, '/operations/clients/approvals', '/client/approvals'),
    visibility: 'client',
  }]
}

export function buildWorkItemQueueItems(
  workItem: any,
  organizationName: string,
  audience: ClientActionQueueAudience = 'management',
): ClientActionQueueItem[] {
  const items: ClientActionQueueItem[] = []
  const visibility: ClientActivityVisibility = workItem.visibleToClient ? 'client' : 'internal'

  if (ACTIVE_WORK_ITEM_STATUSES.has(workItem.status) && isDueSoon(workItem.dueAt)) {
    items.push({
      id: `work_item:${workItem.id}:work_due_soon`,
      organizationId: workItem.organizationId,
      organizationName,
      category: 'work_due_soon',
      title: workItem.title,
      summary: workItem.description || 'Work item is due soon.',
      subjectType: 'work_item',
      subjectId: workItem.id,
      priority: workItem.priority || 'normal',
      dueAt: workItem.dueAt || null,
      href: getQueueHref(audience, workItem.organizationId, '/operations/clients/delivery', '/client/work'),
      visibility,
    })
  }

  if (COMPLETED_WORK_ITEM_STATUSES.has(workItem.status) && isRecentlyCompleted(workItem.completedAt || workItem.updatedAt)) {
    items.push({
      id: `work_item:${workItem.id}:recently_completed`,
      organizationId: workItem.organizationId,
      organizationName,
      category: 'recently_completed',
      title: workItem.title,
      summary: workItem.description || 'Work was completed recently.',
      subjectType: 'work_item',
      subjectId: workItem.id,
      priority: workItem.priority || 'normal',
      dueAt: workItem.completedAt || workItem.updatedAt || null,
      href: getQueueHref(audience, workItem.organizationId, '/operations/clients/delivery', '/client/work'),
      visibility,
    })
  }

  return items
}

export function buildReportQueueItems(
  report: any,
  organizationName: string,
  audience: ClientActionQueueAudience = 'management',
): ClientActionQueueItem[] {
  if (report.status !== 'draft') return []

  return [{
    id: `report:${report.id}:report_ready`,
    organizationId: report.organizationId,
    organizationName,
    category: 'report_ready',
    title: report.title,
    summary: report.summary || 'Draft report is ready for internal review.',
    subjectType: 'report',
    subjectId: report.id,
    priority: 'normal',
    dueAt: report.periodEnd || null,
    href: getQueueHref(audience, report.organizationId, '/operations/clients/reports', '/client/reports'),
    visibility: 'internal',
  }]
}
