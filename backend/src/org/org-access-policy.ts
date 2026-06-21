export interface OrgRoleCatalogEntry {
  department: string
  roles: string[]
}

export interface OrgRoleLike {
  role?: string | null
}

export const ORG_DEPARTMENT_ROLE_CATALOG: OrgRoleCatalogEntry[] = [
  {
    department: 'Owners / Founders',
    roles: ['Owner / Founder'],
  },
  {
    department: 'Project Management',
    roles: ['Project Manager'],
  },
  {
    department: 'Operations',
    roles: [
      'Operations Manager',
      'Fulfillment / Logistics VA',
      'Inventory VA',
      'Customer Experience (CX) VA',
    ],
  },
  {
    department: 'Digital Marketing',
    roles: [
      'Digital Marketing Lead / Marketing VA',
      'Media Buyer / Ads Specialist',
      'Content Creator / Designer',
      'Email & SMS Marketer',
      'Influencer / Social Media VA',
    ],
  },
  {
    department: 'Analytics / Data',
    roles: ['Analytics / Data VA'],
  },
  {
    department: 'Automation / Tech',
    roles: ['Automation / Tech VA'],
  },
  {
    department: 'Website Developers',
    roles: ['Frontend Developer', 'Backend / Technical Developer'],
  },
  {
    department: 'Payroll / Finance',
    roles: ['Bookkeeping', 'Contractor & Salary Payments'],
  },
]

export const DEFAULT_SIGNUP_ROLE_OPTIONS = Object.fromEntries(
  ORG_DEPARTMENT_ROLE_CATALOG.map((entry) => [entry.department, [...entry.roles]]),
) as Record<string, string[]>

export function normalizeOrgRoleName(role?: string | null): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const FULL_ACCESS_ROLES = new Set([
  'admin',
  'administrator',
  'owner',
  'founder',
  'owner_founder',
  'owners_founders',
  'overlord',
])

const MANAGEMENT_ACCESS_ROLES = new Set([
  ...FULL_ACCESS_ROLES,
  'manager',
  'project_manager',
  'operations_manager',
  'chief_operations_officer',
])

const PAYROLL_MANAGEMENT_ROLES = new Set([
  ...FULL_ACCESS_ROLES,
  'operations_manager',
  'bookkeeper',
  'bookkeeping',
  'contractor_salary_payments',
  'financial_controller',
  'payroll_assistant',
  'payroll_finance',
])

const CLIENT_OPERATIONS_ROLES = new Set([
  ...MANAGEMENT_ACCESS_ROLES,
  'web_developer',
  'website_developer',
  'webdev',
  'frontend_developer',
  'backend_technical_developer',
  'lead_frontend_developer',
  'senior_backend_developer',
  'full_stack_developer',
  'ui_ux_designer',
  'app_developer',
  'web_development_assistant',
])

export const CLIENT_DIRECTORY_ONLY_ROLES = new Set([
  'client',
  'client_owner',
  'client_admin',
  'client_member',
  'client_viewer',
])

function hasAccessRole(
  roles: OrgRoleLike[] = [],
  allowedRoles: Set<string>,
  isConfiguredAdminEmail = false,
): boolean {
  if (isConfiguredAdminEmail) return true

  return roles.some((assignment) => allowedRoles.has(normalizeOrgRoleName(assignment.role)))
}

export function isFullAccessRoleName(role?: string | null): boolean {
  return FULL_ACCESS_ROLES.has(normalizeOrgRoleName(role))
}

export function isManagementRoleName(role?: string | null): boolean {
  return MANAGEMENT_ACCESS_ROLES.has(normalizeOrgRoleName(role))
}

export function isPayrollManagementRoleName(role?: string | null): boolean {
  return PAYROLL_MANAGEMENT_ROLES.has(normalizeOrgRoleName(role))
}

export function isClientOperationsRoleName(role?: string | null): boolean {
  return CLIENT_OPERATIONS_ROLES.has(normalizeOrgRoleName(role))
}

export function isClientDirectoryOnlyRoleName(role?: string | null): boolean {
  return CLIENT_DIRECTORY_ONLY_ROLES.has(normalizeOrgRoleName(role))
}

export function hasFullAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasAccessRole(roles, FULL_ACCESS_ROLES, isConfiguredAdminEmail)
}

export function hasManagementAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasAccessRole(roles, MANAGEMENT_ACCESS_ROLES, isConfiguredAdminEmail)
}

export function hasPayrollManagementAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasAccessRole(roles, PAYROLL_MANAGEMENT_ROLES, isConfiguredAdminEmail)
}

export function hasClientOperationsAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasAccessRole(roles, CLIENT_OPERATIONS_ROLES, isConfiguredAdminEmail)
}

export function hasInternalDirectoryAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  if (hasFullAccess(roles, isConfiguredAdminEmail)) return true

  return roles.some((assignment) => {
    const normalizedRole = normalizeOrgRoleName(assignment.role)
    return Boolean(normalizedRole && !CLIENT_DIRECTORY_ONLY_ROLES.has(normalizedRole))
  })
}
