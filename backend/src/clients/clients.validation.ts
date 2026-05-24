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

type InputRecord = Record<string, unknown>

function readTrimmedString(input: InputRecord, key: string): string | undefined {
  const value = input[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
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
