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
}

export interface CreateClientTicketCommentInput {
  body: string
  visibility: string
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

type InputRecord = Record<string, unknown>

const PROJECT_STATUSES = new Set(['planning', 'in_progress', 'review', 'live', 'paused'])
const TICKET_STATUSES = new Set(['new', 'review', 'in_progress', 'done'])

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

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
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
    role: readTrimmedString(input, 'role') || 'client',
    status: readTrimmedString(input, 'status') || 'active',
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
  const url = readTrimmedString(input, 'url')
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
