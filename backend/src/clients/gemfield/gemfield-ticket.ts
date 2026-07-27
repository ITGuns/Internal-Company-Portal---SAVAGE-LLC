// Pure wizard-ticket logic: kinds, categories, priority routing, and input normalization.
// A wizard submission becomes a normal ClientTicket (extend, never parallel) with a few extra
// Gemfield fields; this module is Prisma-free so the routing rules are unit-testable.

export const GEMFIELD_TICKET_KINDS = ['standard', 'callback', 'dev_assist'] as const
export type GemfieldTicketKind = (typeof GEMFIELD_TICKET_KINDS)[number]

export function isGemfieldTicketKind(value: unknown): value is GemfieldTicketKind {
  return typeof value === 'string' && (GEMFIELD_TICKET_KINDS as readonly string[]).includes(value)
}

// Wizard step 1 categories (schema-driven on the client; validated here on the server).
export const GEMFIELD_TICKET_CATEGORIES = [
  'website_change',
  'broken',
  'support',
  'billing',
  'other',
] as const
export type GemfieldTicketCategory = (typeof GEMFIELD_TICKET_CATEGORIES)[number]

export const MAX_WIZARD_ATTACHMENTS = 6

export class GemfieldTicketValidationError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message)
    this.name = 'GemfieldTicketValidationError'
  }
}

/** dev_assist and callback are always high; a broken site is high; everything else is normal. */
export function resolveTicketPriority(kind: GemfieldTicketKind, category: string): 'high' | 'normal' {
  if (kind === 'callback' || kind === 'dev_assist') return 'high'
  if (category === 'broken') return 'high'
  return 'normal'
}

function defaultTitleForCategory(category: string): string {
  switch (category) {
    case 'website_change':
      return 'Website change request'
    case 'broken':
      return 'Something is broken on my site'
    case 'support':
      return 'Support question'
    case 'billing':
      return 'Billing question'
    default:
      return 'New request'
  }
}

export interface GemfieldWizardTicketInput {
  title?: string
  category?: string
  description?: string | null
  projectId?: string | null
  ticketKind?: string
  wizardVersion?: string
  wizardAnswers?: Record<string, unknown> | null
  callbackNumber?: string | null
  callbackWindow?: string | null
}

export interface NormalizedWizardTicket {
  title: string
  category: GemfieldTicketCategory
  description: string | null
  projectId: string | null
  ticketKind: GemfieldTicketKind
  priority: 'high' | 'normal'
  sourceWizardVersion: string | null
  wizardAnswers: Record<string, unknown> | null
}

function coerceCategory(value: unknown): GemfieldTicketCategory {
  return typeof value === 'string' && (GEMFIELD_TICKET_CATEGORIES as readonly string[]).includes(value)
    ? (value as GemfieldTicketCategory)
    : 'other'
}

export function normalizeWizardTicket(input: GemfieldWizardTicketInput): NormalizedWizardTicket {
  const category = coerceCategory(input.category)
  const ticketKind = isGemfieldTicketKind(input.ticketKind) ? input.ticketKind : 'standard'

  const title = (typeof input.title === 'string' && input.title.trim())
    ? input.title.trim().slice(0, 200)
    : defaultTitleForCategory(category)

  // Callback requests fold the phone number + preferred window into the description so a human
  // sees them immediately; the structured copy also lives in wizardAnswers.
  const descriptionParts: string[] = []
  if (typeof input.description === 'string' && input.description.trim()) {
    descriptionParts.push(input.description.trim())
  }
  if (ticketKind === 'callback') {
    const number = typeof input.callbackNumber === 'string' ? input.callbackNumber.trim() : ''
    const window = typeof input.callbackWindow === 'string' ? input.callbackWindow.trim() : ''
    if (number) descriptionParts.push(`Callback requested. Number: ${number}${window ? ` | Preferred time: ${window}` : ''}`)
  }
  const description = descriptionParts.length ? descriptionParts.join('\n\n') : null

  const wizardAnswers =
    input.wizardAnswers && typeof input.wizardAnswers === 'object' ? input.wizardAnswers : null

  return {
    title,
    category,
    description,
    projectId: typeof input.projectId === 'string' && input.projectId ? input.projectId : null,
    ticketKind,
    priority: resolveTicketPriority(ticketKind, category),
    sourceWizardVersion:
      typeof input.wizardVersion === 'string' && input.wizardVersion.trim()
        ? input.wizardVersion.trim().slice(0, 40)
        : null,
    wizardAnswers,
  }
}
