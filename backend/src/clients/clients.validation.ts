export class ClientValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClientValidationError'
  }
}

export interface CreateClientOrganizationInput {
  name: string
  slug: string
  websiteUrl?: string
  tierId?: string
  notes?: string
}

export interface UpdateClientOrganizationStatusInput {
  status: string
}

export interface CreateClientTicketInput {
  title: string
  description?: string
  category: string
  priority: string
  projectId?: string
}

export interface CreateClientMembershipInput {
  userId: string
  role: string
  status: string
}

export interface UpdateClientMembershipInput {
  role?: string
  status?: string
}

export interface InviteClientUserInput {
  email: string
  name?: string
  role: string
  status: string
}

export interface CreateClientProjectInput {
  name: string
  status: string
  summary?: string
  progress: number
  startedAt?: Date
  targetLaunchAt?: Date
  liveUrl?: string
  previewUrl?: string
  internalNotes?: string
}

export interface CreateClientUpdateInput {
  title: string
  body: string
  status: string
  visibleToClient: boolean
  projectId?: string
}

export interface CreateClientMetricSnapshotInput {
  label: string
  value: string
  unit?: string
  periodStart?: Date
  periodEnd?: Date
  source: string
  notes?: string
  visibleToClient: boolean
}

export interface CreateClientResourceLinkInput {
  label: string
  url: string
  type: string
  projectId?: string
  visibleToClient: boolean
  createdById?: string
}

export interface CreateClientTicketCommentInput {
  body: string
  visibility: string
}

export interface UpdateClientResourceLinkInput {
  label?: string
  url?: string
  type?: string
  projectId?: string
  visibleToClient?: boolean
}

export interface UpdateClientProjectInput {
  status?: string
  summary?: string
  progress?: number
  liveUrl?: string
  previewUrl?: string
  internalNotes?: string
}

export interface UpdateClientTicketStatusInput {
  status: string
}

export interface UpdateClientTicketInput {
  title?: string
  description?: string
  category?: string
  priority?: string
}

export interface CreateClientWorkItemInput {
  title: string
  description?: string
  status: string
  priority: string
  progress: number
  dueAt?: Date
  projectId?: string
  assignedToId?: string
  visibleToClient: boolean
  sortOrder: number
}

export interface UpdateClientWorkItemInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  progress?: number
  dueAt?: Date
  completedAt?: Date | null
  projectId?: string
  assignedToId?: string
  visibleToClient?: boolean
  sortOrder?: number
}

export interface CreateClientApprovalInput {
  title: string
  description?: string
  status: string
  dueAt?: Date
  projectId?: string
  visibleToClient: boolean
}

export interface UpdateClientApprovalInput {
  title?: string
  description?: string
  status?: string
  responseNote?: string
  dueAt?: Date
  decidedAt?: Date | null
  projectId?: string
  visibleToClient?: boolean
}

export interface ClientApprovalResponseInput {
  status: string
  responseNote?: string
  decidedAt: Date
}

export interface CreateClientReportInput {
  title: string
  summary?: string
  periodStart: Date
  periodEnd: Date
  status: string
  visibleToClient: boolean
  leadsCaptured?: number
  missedOpportunities?: number
  followUpStatus?: string
  leadSourceBreakdown?: unknown
  reputationSnapshot?: unknown
  localVisibilitySnapshot?: unknown
}

export interface GenerateClientReportDraftInput {
  title?: string
  periodStart: Date
  periodEnd: Date
  visibleToClient: boolean
}

export interface UpdateClientReportInput {
  title?: string
  summary?: string
  periodStart?: Date
  periodEnd?: Date
  status?: string
  visibleToClient?: boolean
  leadsCaptured?: number
  missedOpportunities?: number
  followUpStatus?: string
  leadSourceBreakdown?: unknown
  reputationSnapshot?: unknown
  localVisibilitySnapshot?: unknown
  publishedAt?: Date | null
}

export interface CreateClientRoadmapRecommendationInput {
  title: string
  body: string
  priority: string
  status: string
  impact?: string
  effort?: string
  visibleToClient: boolean
  sortOrder: number
}

export interface UpdateClientRoadmapRecommendationInput {
  title?: string
  body?: string
  priority?: string
  status?: string
  impact?: string
  effort?: string
  visibleToClient?: boolean
  sortOrder?: number
}

export interface CreateClientAssetInput {
  label: string
  url: string
  type: string
  status: string
  notes?: string
  projectId?: string
  visibleToClient: boolean
}

export interface UpdateClientAssetInput {
  label?: string
  url?: string
  type?: string
  status?: string
  notes?: string
  projectId?: string
  visibleToClient?: boolean
}

export interface UpsertClientBillingStatusInput {
  planName?: string
  status: string
  monthlyAmount?: number
  currency: string
  renewalAt?: Date
  notes?: string
  visibleToClient: boolean
}

export interface CreateClientCalendarItemInput {
  title: string
  description?: string
  channel?: string
  status: string
  startAt: Date
  endAt?: Date
  projectId?: string
  visibleToClient: boolean
}

export interface UpdateClientCalendarItemInput {
  title?: string
  description?: string | null
  channel?: string | null
  status?: string
  startAt?: Date
  endAt?: Date | null
  projectId?: string | null
  visibleToClient?: boolean
}

export interface ClientActivityQueryInput {
  limit: number
  visibility?: string
  subjectType?: string
  subjectId?: string
}

type InputRecord = Record<string, unknown>

const CLIENT_ORGANIZATION_STATUSES = new Set(['active', 'paused', 'archived'])
const PROJECT_STATUSES = new Set(['planning', 'in_progress', 'review', 'live', 'paused'])
const TICKET_STATUSES = new Set(['new', 'review', 'in_progress', 'done'])
const CLIENT_MEMBERSHIP_ROLES = new Set(['client_owner', 'client_admin', 'client_member', 'client'])
const CLIENT_MEMBERSHIP_ROLE_ALIASES = new Map([
  ['owner', 'client_owner'],
  ['admin', 'client_admin'],
  ['member', 'client_member'],
])
const CLIENT_MEMBERSHIP_STATUSES = new Set(['active', 'inactive'])
const WORK_ITEM_STATUSES = new Set(['open', 'in_progress', 'review', 'completed', 'blocked', 'archived'])
const CLIENT_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent'])
const APPROVAL_STATUSES = new Set(['pending', 'approved', 'changes_requested', 'rejected', 'archived'])
const CLIENT_APPROVAL_RESPONSE_STATUSES = new Set(['approved', 'changes_requested'])
const REPORT_STATUSES = new Set(['draft', 'published', 'archived'])
const ROADMAP_STATUSES = new Set(['recommended', 'next', 'planned', 'done', 'archived'])
const ASSET_STATUSES = new Set(['draft', 'requested', 'received', 'approved', 'archived'])
const BILLING_STATUSES = new Set(['active', 'trial', 'past_due', 'paused', 'cancelled', 'archived'])
const CALENDAR_STATUSES = new Set(['planned', 'scheduled', 'published', 'cancelled', 'archived'])
const ACTIVITY_VISIBILITIES = new Set(['internal', 'client'])

function readTrimmedString(input: InputRecord, key: string): string | undefined {
  const value = input[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function readBoolean(input: InputRecord, key: string, defaultValue: boolean): boolean {
  const value = input[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return defaultValue
}

function readDate(input: InputRecord, key: string): Date | undefined {
  const value = readTrimmedString(input, key)
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ClientValidationError(`${key} must be a valid date`)
  }
  return date
}

function readNullableDate(input: InputRecord, key: string): Date | null | undefined {
  if (!(key in input)) return undefined
  const value = input[key]
  if (value === null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  return readDate(input, key)
}

function readNullableTrimmedString(input: InputRecord, key: string): string | null | undefined {
  if (!(key in input)) return undefined
  const value = input[key]
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  return value.trim() || null
}

function readHttpUrl(input: InputRecord, key: string, label: string): string | undefined {
  const value = readTrimmedString(input, key)
  if (!value) return undefined

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new ClientValidationError(`${label} must be a valid URL`)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ClientValidationError(`${label} must be an http or https URL`)
  }

  return value
}

function readRequiredDate(input: InputRecord, key: string): Date {
  const date = readDate(input, key)
  if (!date) throw new ClientValidationError(`${key} is required`)
  return date
}

function readProgress(input: InputRecord): number {
  const value = input.progress
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  if (Number.isNaN(numberValue)) return 0
  return Math.min(100, Math.max(0, Math.round(numberValue)))
}

function readOptionalProgress(input: InputRecord): number | undefined {
  if (!('progress' in input)) return undefined
  return readProgress(input)
}

function readInteger(input: InputRecord, key: string, defaultValue = 0): number {
  const value = input[key]
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : defaultValue
  if (Number.isNaN(numberValue)) return defaultValue
  return Math.round(numberValue)
}

function readOptionalInteger(input: InputRecord, key: string): number | undefined {
  if (!(key in input)) return undefined
  return readInteger(input, key, 0)
}

function readNonNegativeInteger(input: InputRecord, key: string): number | undefined {
  const value = readOptionalInteger(input, key)
  if (value === undefined) return undefined
  if (value < 0) throw new ClientValidationError(`${key} cannot be negative`)
  return value
}

function readLimitedInteger(input: InputRecord, key: string, defaultValue: number, min: number, max: number): number {
  const value = readInteger(input, key, defaultValue)
  if (value < min) return min
  if (value > max) return max
  return value
}

function readNumber(input: InputRecord, key: string): number | undefined {
  if (!(key in input)) return undefined
  const value = input[key]
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : undefined
  if (typeof numberValue !== 'number' || Number.isNaN(numberValue)) {
    throw new ClientValidationError(`${key} must be a valid number`)
  }
  return numberValue
}

function readNonNegativeNumber(input: InputRecord, key: string): number | undefined {
  const value = readNumber(input, key)
  if (value === undefined) return undefined
  if (value < 0) throw new ClientValidationError(`${key} cannot be negative`)
  return value
}

function readSnapshot(input: InputRecord, key: string): unknown {
  if (!(key in input)) return undefined
  const value = input[key]
  if (value === null || typeof value === 'object') return value
  throw new ClientValidationError(`${key} must be an object or array`)
}

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function readStatus(input: InputRecord, key: string, allowed: Set<string>, defaultValue: string): string {
  const status = normalizeStatus(readTrimmedString(input, key) || defaultValue)
  if (!allowed.has(status)) throw new ClientValidationError(`${key} is invalid`)
  return status
}

function readOptionalStatus(input: InputRecord, key: string, allowed: Set<string>): string | undefined {
  const value = readTrimmedString(input, key)
  if (!value) return undefined
  const status = normalizeStatus(value)
  if (!allowed.has(status)) throw new ClientValidationError(`${key} is invalid`)
  return status
}

function readPriority(input: InputRecord, key: string, defaultValue: string): string {
  return readStatus(input, key, CLIENT_PRIORITIES, defaultValue)
}

function readOptionalPriority(input: InputRecord, key: string): string | undefined {
  return readOptionalStatus(input, key, CLIENT_PRIORITIES)
}

function normalizeClientMembershipRole(value: string): string {
  const role = normalizeStatus(value)
  return CLIENT_MEMBERSHIP_ROLE_ALIASES.get(role) || role
}

function readClientMembershipRole(input: InputRecord, key: string, defaultValue: string): string {
  const role = normalizeClientMembershipRole(readTrimmedString(input, key) || defaultValue)
  if (!CLIENT_MEMBERSHIP_ROLES.has(role)) throw new ClientValidationError(`${key} is invalid`)
  return role
}

function readOptionalClientMembershipRole(input: InputRecord, key: string): string | undefined {
  const value = readTrimmedString(input, key)
  if (!value) return undefined
  const role = normalizeClientMembershipRole(value)
  if (!CLIENT_MEMBERSHIP_ROLES.has(role)) throw new ClientValidationError(`${key} is invalid`)
  return role
}

function readCurrency(input: InputRecord): string {
  return (readTrimmedString(input, 'currency') || 'USD').toUpperCase()
}

function readEmail(input: InputRecord, key: string): string {
  const email = readTrimmedString(input, key)?.toLowerCase()
  if (!email) throw new ClientValidationError(`${key} is required`)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ClientValidationError(`${key} must be a valid email address`)
  }
  return email
}

function assertHasUpdates(data: InputRecord) {
  if (Object.keys(data).length === 0) {
    throw new ClientValidationError('At least one field is required')
  }
}

export function slugifyClientOrganizationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseCreateClientOrganizationInput(input: InputRecord): CreateClientOrganizationInput {
  const name = readTrimmedString(input, 'name')
  if (!name) throw new ClientValidationError('Client organization name is required')

  const requestedSlug = readTrimmedString(input, 'slug')
  const slug = slugifyClientOrganizationName(requestedSlug || name)
  if (!slug) throw new ClientValidationError('Client organization slug is required')

  return {
    name,
    slug,
    websiteUrl: readTrimmedString(input, 'websiteUrl'),
    tierId: readTrimmedString(input, 'tierId'),
    notes: readTrimmedString(input, 'notes'),
  }
}

export function parseUpdateClientOrganizationStatusInput(input: InputRecord): UpdateClientOrganizationStatusInput {
  return {
    status: readStatus(input, 'status', CLIENT_ORGANIZATION_STATUSES, ''),
  }
}

export function parseCreateClientTicketInput(input: InputRecord): CreateClientTicketInput {
  const title = readTrimmedString(input, 'title')
  if (!title) throw new ClientValidationError('Ticket title is required')

  return {
    title,
    description: readTrimmedString(input, 'description'),
    category: readTrimmedString(input, 'category') || 'general',
    priority: readTrimmedString(input, 'priority') || 'normal',
    projectId: readTrimmedString(input, 'projectId'),
  }
}

export function parseCreateClientMembershipInput(input: InputRecord): CreateClientMembershipInput {
  const userId = readTrimmedString(input, 'userId')
  if (!userId) throw new ClientValidationError('User ID is required')

  return {
    userId,
    role: readClientMembershipRole(input, 'role', 'client'),
    status: readStatus(input, 'status', CLIENT_MEMBERSHIP_STATUSES, 'active'),
  }
}

export function parseUpdateClientMembershipInput(input: InputRecord): UpdateClientMembershipInput {
  const data: UpdateClientMembershipInput = {
    ...(readOptionalClientMembershipRole(input, 'role') ? { role: readOptionalClientMembershipRole(input, 'role') } : {}),
    ...(readOptionalStatus(input, 'status', CLIENT_MEMBERSHIP_STATUSES) ? { status: readOptionalStatus(input, 'status', CLIENT_MEMBERSHIP_STATUSES) } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseInviteClientUserInput(input: InputRecord): InviteClientUserInput {
  return {
    email: readEmail(input, 'email'),
    name: readTrimmedString(input, 'name'),
    role: readClientMembershipRole(input, 'role', 'client_member'),
    status: readStatus(input, 'status', CLIENT_MEMBERSHIP_STATUSES, 'active'),
  }
}

export function parseCreateClientProjectInput(input: InputRecord): CreateClientProjectInput {
  const name = readTrimmedString(input, 'name')
  if (!name) throw new ClientValidationError('Project name is required')

  const status = normalizeStatus(readTrimmedString(input, 'status') || 'planning')
  if (!PROJECT_STATUSES.has(status)) throw new ClientValidationError('Project status is invalid')

  return {
    name,
    status,
    summary: readTrimmedString(input, 'summary'),
    progress: readProgress(input),
    startedAt: readDate(input, 'startedAt'),
    targetLaunchAt: readDate(input, 'targetLaunchAt'),
    liveUrl: readTrimmedString(input, 'liveUrl'),
    previewUrl: readTrimmedString(input, 'previewUrl'),
    internalNotes: readTrimmedString(input, 'internalNotes'),
  }
}

export function parseCreateClientUpdateInput(input: InputRecord): CreateClientUpdateInput {
  const title = readTrimmedString(input, 'title')
  const body = readTrimmedString(input, 'body')
  if (!title) throw new ClientValidationError('Update title is required')
  if (!body) throw new ClientValidationError('Update body is required')

  return {
    title,
    body,
    status: readTrimmedString(input, 'status') || 'published',
    visibleToClient: readBoolean(input, 'visibleToClient', true),
    projectId: readTrimmedString(input, 'projectId'),
  }
}

export function parseCreateClientMetricSnapshotInput(input: InputRecord): CreateClientMetricSnapshotInput {
  const label = readTrimmedString(input, 'label')
  const rawValue = input.value
  const value = typeof rawValue === 'number' ? String(rawValue) : readTrimmedString(input, 'value')
  if (!label) throw new ClientValidationError('Metric label is required')
  if (!value) throw new ClientValidationError('Metric value is required')

  return {
    label,
    value,
    unit: readTrimmedString(input, 'unit'),
    periodStart: readDate(input, 'periodStart'),
    periodEnd: readDate(input, 'periodEnd'),
    source: readTrimmedString(input, 'source') || 'manual',
    notes: readTrimmedString(input, 'notes'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
  }
}

export function parseCreateClientResourceLinkInput(input: InputRecord): CreateClientResourceLinkInput {
  const label = readTrimmedString(input, 'label')
  const url = readHttpUrl(input, 'url', 'Resource URL')
  if (!label) throw new ClientValidationError('Resource label is required')
  if (!url) throw new ClientValidationError('Resource URL is required')

  return {
    label,
    url,
    type: readTrimmedString(input, 'type') || 'link',
    projectId: readTrimmedString(input, 'projectId'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
  }
}

export function parseUpdateClientResourceLinkInput(input: InputRecord): UpdateClientResourceLinkInput {
  const url = 'url' in input ? readHttpUrl(input, 'url', 'Resource URL') : undefined
  const data: UpdateClientResourceLinkInput = {
    ...(readTrimmedString(input, 'label') ? { label: readTrimmedString(input, 'label') } : {}),
    ...(url ? { url } : {}),
    ...(readTrimmedString(input, 'type') ? { type: readTrimmedString(input, 'type') } : {}),
    ...(readTrimmedString(input, 'projectId') ? { projectId: readTrimmedString(input, 'projectId') } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseCreateClientTicketCommentInput(
  input: InputRecord,
  canCreateInternalComments: boolean,
): CreateClientTicketCommentInput {
  const body = readTrimmedString(input, 'body')
  if (!body) throw new ClientValidationError('Comment body is required')

  const requestedVisibility = readTrimmedString(input, 'visibility') || 'client'
  return {
    body,
    visibility: canCreateInternalComments && requestedVisibility === 'internal' ? 'internal' : 'client',
  }
}

export function parseUpdateClientProjectInput(input: InputRecord): UpdateClientProjectInput {
  const statusValue = readTrimmedString(input, 'status')
  const status = statusValue ? normalizeStatus(statusValue) : undefined
  if (status && !PROJECT_STATUSES.has(status)) throw new ClientValidationError('Project status is invalid')

  const data: UpdateClientProjectInput = {
    ...(status ? { status } : {}),
    ...('progress' in input ? { progress: readOptionalProgress(input) } : {}),
    ...(readTrimmedString(input, 'summary') ? { summary: readTrimmedString(input, 'summary') } : {}),
    ...(readTrimmedString(input, 'liveUrl') ? { liveUrl: readTrimmedString(input, 'liveUrl') } : {}),
    ...(readTrimmedString(input, 'previewUrl') ? { previewUrl: readTrimmedString(input, 'previewUrl') } : {}),
    ...(readTrimmedString(input, 'internalNotes') ? { internalNotes: readTrimmedString(input, 'internalNotes') } : {}),
  }

  if (Object.keys(data).length === 0) {
    throw new ClientValidationError('At least one project field is required')
  }

  return data
}

export function parseUpdateClientTicketStatusInput(input: InputRecord): UpdateClientTicketStatusInput {
  const requestedStatus = readTrimmedString(input, 'status')
  if (!requestedStatus) throw new ClientValidationError('Ticket status is required')

  const status = normalizeStatus(requestedStatus)
  if (!TICKET_STATUSES.has(status)) throw new ClientValidationError('Ticket status is invalid')

  return { status }
}

export function parseUpdateClientTicketInput(input: InputRecord): UpdateClientTicketInput {
  const data: UpdateClientTicketInput = {
    ...(readTrimmedString(input, 'title') ? { title: readTrimmedString(input, 'title') } : {}),
    ...(readTrimmedString(input, 'description') ? { description: readTrimmedString(input, 'description') } : {}),
    ...(readTrimmedString(input, 'category') ? { category: readTrimmedString(input, 'category') } : {}),
    ...(readOptionalPriority(input, 'priority') ? { priority: readOptionalPriority(input, 'priority') } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseCreateClientWorkItemInput(input: InputRecord): CreateClientWorkItemInput {
  const title = readTrimmedString(input, 'title')
  if (!title) throw new ClientValidationError('Work item title is required')

  return {
    title,
    description: readTrimmedString(input, 'description'),
    status: readStatus(input, 'status', WORK_ITEM_STATUSES, 'open'),
    priority: readPriority(input, 'priority', 'normal'),
    progress: readProgress(input),
    dueAt: readDate(input, 'dueAt'),
    projectId: readTrimmedString(input, 'projectId'),
    assignedToId: readTrimmedString(input, 'assignedToId'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
    sortOrder: readInteger(input, 'sortOrder', 0),
  }
}

export function parseUpdateClientWorkItemInput(input: InputRecord): UpdateClientWorkItemInput {
  const status = readOptionalStatus(input, 'status', WORK_ITEM_STATUSES)
  const priority = readOptionalPriority(input, 'priority')
  const data: UpdateClientWorkItemInput = {
    ...(readTrimmedString(input, 'title') ? { title: readTrimmedString(input, 'title') } : {}),
    ...(readTrimmedString(input, 'description') ? { description: readTrimmedString(input, 'description') } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...('progress' in input ? { progress: readOptionalProgress(input) } : {}),
    ...(readDate(input, 'dueAt') ? { dueAt: readDate(input, 'dueAt') } : {}),
    ...(readTrimmedString(input, 'projectId') ? { projectId: readTrimmedString(input, 'projectId') } : {}),
    ...(readTrimmedString(input, 'assignedToId') ? { assignedToId: readTrimmedString(input, 'assignedToId') } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
    ...('sortOrder' in input ? { sortOrder: readOptionalInteger(input, 'sortOrder') } : {}),
    ...(status === 'completed' ? { completedAt: new Date() } : {}),
    ...(status && status !== 'completed' ? { completedAt: null } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseCreateClientApprovalInput(input: InputRecord): CreateClientApprovalInput {
  const title = readTrimmedString(input, 'title')
  if (!title) throw new ClientValidationError('Approval title is required')

  return {
    title,
    description: readTrimmedString(input, 'description'),
    status: readStatus(input, 'status', APPROVAL_STATUSES, 'pending'),
    dueAt: readDate(input, 'dueAt'),
    projectId: readTrimmedString(input, 'projectId'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
  }
}

export function parseUpdateClientApprovalInput(input: InputRecord): UpdateClientApprovalInput {
  const status = readOptionalStatus(input, 'status', APPROVAL_STATUSES)
  const data: UpdateClientApprovalInput = {
    ...(readTrimmedString(input, 'title') ? { title: readTrimmedString(input, 'title') } : {}),
    ...(readTrimmedString(input, 'description') ? { description: readTrimmedString(input, 'description') } : {}),
    ...(status ? { status } : {}),
    ...(readTrimmedString(input, 'responseNote') ? { responseNote: readTrimmedString(input, 'responseNote') } : {}),
    ...(readDate(input, 'dueAt') ? { dueAt: readDate(input, 'dueAt') } : {}),
    ...(readTrimmedString(input, 'projectId') ? { projectId: readTrimmedString(input, 'projectId') } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
    ...(status && status !== 'pending' && status !== 'archived' ? { decidedAt: new Date() } : {}),
    ...(status === 'pending' ? { decidedAt: null } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseClientApprovalResponseInput(input: InputRecord): ClientApprovalResponseInput {
  const status = readStatus(input, 'status', CLIENT_APPROVAL_RESPONSE_STATUSES, '')
  const responseNote = readTrimmedString(input, 'responseNote')
  if (status === 'changes_requested' && !responseNote) {
    throw new ClientValidationError('Response note is required when requesting changes')
  }

  return {
    status,
    responseNote,
    decidedAt: new Date(),
  }
}

export function parseCreateClientReportInput(input: InputRecord): CreateClientReportInput {
  const title = readTrimmedString(input, 'title')
  if (!title) throw new ClientValidationError('Report title is required')

  const periodStart = readRequiredDate(input, 'periodStart')
  const periodEnd = readRequiredDate(input, 'periodEnd')
  if (periodEnd < periodStart) throw new ClientValidationError('Report periodEnd must be after periodStart')

  return {
    title,
    summary: readTrimmedString(input, 'summary'),
    periodStart,
    periodEnd,
    status: readStatus(input, 'status', REPORT_STATUSES, 'draft'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
    leadsCaptured: readNonNegativeInteger(input, 'leadsCaptured'),
    missedOpportunities: readNonNegativeInteger(input, 'missedOpportunities'),
    followUpStatus: readTrimmedString(input, 'followUpStatus'),
    leadSourceBreakdown: readSnapshot(input, 'leadSourceBreakdown'),
    reputationSnapshot: readSnapshot(input, 'reputationSnapshot'),
    localVisibilitySnapshot: readSnapshot(input, 'localVisibilitySnapshot'),
  }
}

export function parseGenerateClientReportDraftInput(input: InputRecord): GenerateClientReportDraftInput {
  const periodStart = readRequiredDate(input, 'periodStart')
  const periodEnd = readRequiredDate(input, 'periodEnd')
  if (periodEnd < periodStart) throw new ClientValidationError('Report periodEnd must be after periodStart')

  return {
    title: readTrimmedString(input, 'title'),
    periodStart,
    periodEnd,
    visibleToClient: readBoolean(input, 'visibleToClient', true),
  }
}

export function parseUpdateClientReportInput(input: InputRecord): UpdateClientReportInput {
  const status = readOptionalStatus(input, 'status', REPORT_STATUSES)
  const data: UpdateClientReportInput = {
    ...(readTrimmedString(input, 'title') ? { title: readTrimmedString(input, 'title') } : {}),
    ...(readTrimmedString(input, 'summary') ? { summary: readTrimmedString(input, 'summary') } : {}),
    ...(readDate(input, 'periodStart') ? { periodStart: readDate(input, 'periodStart') } : {}),
    ...(readDate(input, 'periodEnd') ? { periodEnd: readDate(input, 'periodEnd') } : {}),
    ...(status ? { status } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
    ...('leadsCaptured' in input ? { leadsCaptured: readNonNegativeInteger(input, 'leadsCaptured') } : {}),
    ...('missedOpportunities' in input ? { missedOpportunities: readNonNegativeInteger(input, 'missedOpportunities') } : {}),
    ...(readTrimmedString(input, 'followUpStatus') ? { followUpStatus: readTrimmedString(input, 'followUpStatus') } : {}),
    ...(readSnapshot(input, 'leadSourceBreakdown') !== undefined ? { leadSourceBreakdown: readSnapshot(input, 'leadSourceBreakdown') } : {}),
    ...(readSnapshot(input, 'reputationSnapshot') !== undefined ? { reputationSnapshot: readSnapshot(input, 'reputationSnapshot') } : {}),
    ...(readSnapshot(input, 'localVisibilitySnapshot') !== undefined ? { localVisibilitySnapshot: readSnapshot(input, 'localVisibilitySnapshot') } : {}),
    ...(status === 'published' ? { publishedAt: new Date() } : {}),
    ...(status === 'draft' ? { publishedAt: null } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseCreateClientRoadmapRecommendationInput(input: InputRecord): CreateClientRoadmapRecommendationInput {
  const title = readTrimmedString(input, 'title')
  const body = readTrimmedString(input, 'body')
  if (!title) throw new ClientValidationError('Roadmap title is required')
  if (!body) throw new ClientValidationError('Roadmap body is required')

  return {
    title,
    body,
    priority: readPriority(input, 'priority', 'normal'),
    status: readStatus(input, 'status', ROADMAP_STATUSES, 'recommended'),
    impact: readTrimmedString(input, 'impact'),
    effort: readTrimmedString(input, 'effort'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
    sortOrder: readInteger(input, 'sortOrder', 0),
  }
}

export function parseUpdateClientRoadmapRecommendationInput(input: InputRecord): UpdateClientRoadmapRecommendationInput {
  const priority = readOptionalPriority(input, 'priority')
  const data: UpdateClientRoadmapRecommendationInput = {
    ...(readTrimmedString(input, 'title') ? { title: readTrimmedString(input, 'title') } : {}),
    ...(readTrimmedString(input, 'body') ? { body: readTrimmedString(input, 'body') } : {}),
    ...(priority ? { priority } : {}),
    ...(readOptionalStatus(input, 'status', ROADMAP_STATUSES) ? { status: readOptionalStatus(input, 'status', ROADMAP_STATUSES) } : {}),
    ...(readTrimmedString(input, 'impact') ? { impact: readTrimmedString(input, 'impact') } : {}),
    ...(readTrimmedString(input, 'effort') ? { effort: readTrimmedString(input, 'effort') } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
    ...('sortOrder' in input ? { sortOrder: readOptionalInteger(input, 'sortOrder') } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseCreateClientAssetInput(input: InputRecord): CreateClientAssetInput {
  const label = readTrimmedString(input, 'label')
  const url = readTrimmedString(input, 'url')
  if (!label) throw new ClientValidationError('Asset label is required')
  if (!url) throw new ClientValidationError('Asset URL is required')

  return {
    label,
    url,
    type: readTrimmedString(input, 'type') || 'link',
    status: readStatus(input, 'status', ASSET_STATUSES, 'received'),
    notes: readTrimmedString(input, 'notes'),
    projectId: readTrimmedString(input, 'projectId'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
  }
}

export function parseUpdateClientAssetInput(input: InputRecord): UpdateClientAssetInput {
  const data: UpdateClientAssetInput = {
    ...(readTrimmedString(input, 'label') ? { label: readTrimmedString(input, 'label') } : {}),
    ...(readTrimmedString(input, 'url') ? { url: readTrimmedString(input, 'url') } : {}),
    ...(readTrimmedString(input, 'type') ? { type: readTrimmedString(input, 'type') } : {}),
    ...(readOptionalStatus(input, 'status', ASSET_STATUSES) ? { status: readOptionalStatus(input, 'status', ASSET_STATUSES) } : {}),
    ...(readTrimmedString(input, 'notes') ? { notes: readTrimmedString(input, 'notes') } : {}),
    ...(readTrimmedString(input, 'projectId') ? { projectId: readTrimmedString(input, 'projectId') } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseUpsertClientBillingStatusInput(input: InputRecord): UpsertClientBillingStatusInput {
  return {
    planName: readTrimmedString(input, 'planName'),
    status: readStatus(input, 'status', BILLING_STATUSES, 'active'),
    monthlyAmount: readNonNegativeNumber(input, 'monthlyAmount'),
    currency: readCurrency(input),
    renewalAt: readDate(input, 'renewalAt'),
    notes: readTrimmedString(input, 'notes'),
    visibleToClient: readBoolean(input, 'visibleToClient', false),
  }
}

export function parseCreateClientCalendarItemInput(input: InputRecord): CreateClientCalendarItemInput {
  const title = readTrimmedString(input, 'title')
  if (!title) throw new ClientValidationError('Calendar item title is required')
  const startAt = readRequiredDate(input, 'startAt')
  const endAt = readDate(input, 'endAt')
  if (endAt && endAt < startAt) throw new ClientValidationError('Calendar endAt must be after startAt')

  return {
    title,
    description: readTrimmedString(input, 'description'),
    channel: readTrimmedString(input, 'channel'),
    status: readStatus(input, 'status', CALENDAR_STATUSES, 'planned'),
    startAt,
    endAt,
    projectId: readTrimmedString(input, 'projectId'),
    visibleToClient: readBoolean(input, 'visibleToClient', true),
  }
}

export function parseUpdateClientCalendarItemInput(input: InputRecord): UpdateClientCalendarItemInput {
  const startAt = readDate(input, 'startAt')
  const endAt = readNullableDate(input, 'endAt')
  if (startAt && endAt && endAt < startAt) throw new ClientValidationError('Calendar endAt must be after startAt')
  const title = readTrimmedString(input, 'title')
  const description = readNullableTrimmedString(input, 'description')
  const channel = readNullableTrimmedString(input, 'channel')
  const status = readOptionalStatus(input, 'status', CALENDAR_STATUSES)
  const projectId = readNullableTrimmedString(input, 'projectId')

  const data: UpdateClientCalendarItemInput = {
    ...(title ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(channel !== undefined ? { channel } : {}),
    ...(status ? { status } : {}),
    ...(startAt ? { startAt } : {}),
    ...(endAt !== undefined ? { endAt } : {}),
    ...(projectId !== undefined ? { projectId } : {}),
    ...('visibleToClient' in input ? { visibleToClient: readBoolean(input, 'visibleToClient', true) } : {}),
  }

  assertHasUpdates(data as InputRecord)
  return data
}

export function parseClientActivityQuery(query: InputRecord): ClientActivityQueryInput {
  const visibility = readOptionalStatus(query, 'visibility', ACTIVITY_VISIBILITIES)
  const subjectType = readTrimmedString(query, 'subjectType')
  const subjectId = readTrimmedString(query, 'subjectId')

  if (subjectId && !subjectType) {
    throw new ClientValidationError('Activity subjectType is required when subjectId is provided')
  }

  return {
    limit: readLimitedInteger(query, 'limit', 30, 1, 100),
    ...(visibility ? { visibility } : {}),
    ...(subjectType ? { subjectType } : {}),
    ...(subjectId ? { subjectId } : {}),
  }
}
