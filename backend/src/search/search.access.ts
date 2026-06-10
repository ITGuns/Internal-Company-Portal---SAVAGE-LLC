import {
  hasClientOperationsAccess,
  hasFullAccess,
  hasInternalDirectoryAccess,
  hasManagementAccess,
  hasPayrollManagementAccess,
  normalizeOrgRoleName,
} from '../org/org-access-policy'

export interface GlobalSearchRoleAssignment {
  role: string
  department?: {
    name?: string | null
  } | null
}

export interface GlobalSearchClientMembership {
  organizationId: string
  status?: string | null
}

export interface GlobalSearchAccess {
  requesterId: string
  canSearchInternal: boolean
  canSearchInternalDirectory: boolean
  canSearchManagementRecords: boolean
  canSearchPayroll: boolean
  canSearchClientOperations: boolean
  canSearchAllFileDepartments: boolean
  departmentNames: string[]
  clientOrganizationIds: string[]
}

export function normalizeGlobalSearchQuery(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80)
}

export function buildGlobalSearchAccess(params: {
  requesterId: string
  roles: GlobalSearchRoleAssignment[]
  memberships: GlobalSearchClientMembership[]
  isConfiguredAdminEmail?: boolean
}): GlobalSearchAccess {
  const isConfiguredAdminEmail = Boolean(params.isConfiguredAdminEmail)
  const clientOrganizationIds = params.memberships
    .filter((membership) => normalizeOrgRoleName(membership.status || 'active') === 'active')
    .map((membership) => membership.organizationId)
  const departmentNames = Array.from(new Set(
    params.roles
      .map((assignment) => String(assignment.department?.name || '').trim())
      .filter(Boolean),
  ))

  return {
    requesterId: params.requesterId,
    canSearchInternal: hasInternalDirectoryAccess(params.roles, isConfiguredAdminEmail),
    canSearchInternalDirectory: hasInternalDirectoryAccess(params.roles, isConfiguredAdminEmail),
    canSearchManagementRecords: hasManagementAccess(params.roles, isConfiguredAdminEmail),
    canSearchPayroll: hasPayrollManagementAccess(params.roles, isConfiguredAdminEmail),
    canSearchClientOperations: hasClientOperationsAccess(params.roles, isConfiguredAdminEmail),
    canSearchAllFileDepartments: hasFullAccess(params.roles, isConfiguredAdminEmail),
    departmentNames,
    clientOrganizationIds,
  }
}
