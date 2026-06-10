export const ACTIVE_USER_STATUSES = ['active', 'vacation', 'leave', 'verified']
export const CLIENT_DIRECTORY_ONLY_ROLES = ['client', 'client_owner', 'client_admin', 'client_member', 'client_viewer']

type OrganizationRecord = {
  organization?: { name?: string | null } | null
  organizationId?: string | null
}

export function toDateLabel(value?: Date | string | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function compact(parts: Array<string | null | undefined>): string {
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' - ')
}

export function organizationName(record: OrganizationRecord): string {
  return record.organization?.name || record.organizationId || ''
}
