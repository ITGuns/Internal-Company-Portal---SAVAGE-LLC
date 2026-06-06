import {
  hasClientOperationsAccess,
  normalizeOrgRoleName,
} from '../org/org-access-policy'

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
  status?: string | null
}

export interface ClientOrganizationVisibilityFilter {
  status?: string
  memberships?: {
    some: {
      userId: string
      status: string
    }
  }
}

export function normalizeClientRole(role: string): string {
  return normalizeOrgRoleName(role)
}

export function hasClientManagementAccess(
  roles: ClientRoleAssignment[],
  isAdminByEmail = false,
): boolean {
  return hasClientOperationsAccess(roles, isAdminByEmail)
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
    status: 'active',
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
  if (access.isPrivileged) return true
  if (organization.status && normalizeClientRole(organization.status) !== 'active') return false
  return getActiveClientOrganizationIds(access).includes(organization.id)
}

export function canManageClientOrganization(access: ClientAccessContext): boolean {
  return access.isPrivileged
}

export function canCreateClientTicket(access: ClientAccessContext, organizationId: string): boolean {
  return access.isPrivileged || getActiveClientOrganizationIds(access).includes(organizationId)
}
