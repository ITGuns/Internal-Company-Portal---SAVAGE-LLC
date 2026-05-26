export interface ClientRoleAssignment {
  role: string
}

export interface ClientMembershipAssignment {
  organizationId: string
  role?: string | null
  status?: string | null
}

export interface ClientAccessContext {
  requesterId: string
  isPrivileged: boolean
  memberships: ClientMembershipAssignment[]
}

export interface ReadableClientOrganization {
  id: string
}

export interface ClientOrganizationVisibilityFilter {
  memberships?: {
    some: {
      userId: string
      status: string
    }
  }
}

const CLIENT_MANAGEMENT_ROLES = new Set([
  'admin',
  'administrator',
  'manager',
  'operations_manager',
  'chief_operations_officer',
])

export function normalizeClientRole(role: string): string {
  return role.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function hasClientManagementAccess(
  roles: ClientRoleAssignment[],
  isAdminByEmail = false,
): boolean {
  return isAdminByEmail || roles.some((role) => CLIENT_MANAGEMENT_ROLES.has(normalizeClientRole(role.role)))
}

export function getActiveClientOrganizationIds(access: ClientAccessContext): string[] {
  return access.memberships
    .filter((membership) => normalizeClientRole(membership.status || 'active') === 'active')
    .map((membership) => membership.organizationId)
}

export function getClientOrganizationVisibilityFilter(
  access: ClientAccessContext,
): ClientOrganizationVisibilityFilter {
  if (access.isPrivileged) return {}

  return {
    memberships: {
      some: {
        userId: access.requesterId,
        status: 'active',
      },
    },
  }
}

export function canReadClientOrganization(
  access: ClientAccessContext,
  organization: ReadableClientOrganization,
): boolean {
  return access.isPrivileged || getActiveClientOrganizationIds(access).includes(organization.id)
}

export function canManageClientOrganization(access: ClientAccessContext): boolean {
  return access.isPrivileged
}

export function canCreateClientTicket(access: ClientAccessContext, organizationId: string): boolean {
  return access.isPrivileged || getActiveClientOrganizationIds(access).includes(organizationId)
}
