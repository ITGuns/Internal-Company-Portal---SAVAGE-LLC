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
    roles: ['Frontend Developer', 'Backend / Technical Developer', 'Gemfield Developer'],
  },
  {
    department: 'Payroll / Finance',
    // Disbursement Officer (2026-10-28) signs off payslips before they are paid.
    roles: ['Bookkeeping', 'Contractor & Salary Payments', 'Disbursement Officer'],
  },
]

// Catalog roles nobody may request at signup (review fix 2026-10-28): approving a
// signup assigns the requested role as it is, and the Disbursement Officer signs
// off pay, so Operations assigns it. It stays in the catalog (and AvailableRole).
// Mirrored in frontend/src/lib/signup-options.ts.
export const NON_REQUESTABLE_SIGNUP_ROLES: ReadonlySet<string> = new Set(['disbursement_officer'])

export function isSignupRequestableRole(role?: string | null): boolean {
  return !NON_REQUESTABLE_SIGNUP_ROLES.has(normalizeOrgRoleName(role))
}

export const DEFAULT_SIGNUP_ROLE_OPTIONS = Object.fromEntries(
  ORG_DEPARTMENT_ROLE_CATALOG.map((entry) => [entry.department, entry.roles.filter(isSignupRequestableRole)]),
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

// Exported read-only so route-level role lists (payroll.permissions.ts) derive
// from the same source and cannot drift.
export const MANAGEMENT_ACCESS_ROLES: ReadonlySet<string> = new Set([
  ...FULL_ACCESS_ROLES,
  'manager',
  'project_manager',
  'operations_manager',
  'chief_operations_officer',
])

export const PAYROLL_MANAGEMENT_ROLES: ReadonlySet<string> = new Set([
  ...FULL_ACCESS_ROLES,
  'operations_manager',
  'bookkeeper',
  'bookkeeping',
  'contractor_salary_payments',
  'financial_controller',
  'payroll_assistant',
  'payroll_finance',
  'disbursement_officer',
])

// Who may approve payslips for disbursement (sign-off, 2026-10-28): the
// Disbursement Officer role or a full-access account. Payroll managers without
// the role still generate and edit payslips, but do not sign.
export const DISBURSEMENT_SIGNER_ROLES: ReadonlySet<string> = new Set([
  ...FULL_ACCESS_ROLES,
  'disbursement_officer',
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
  'gemfield_developer',
])

// Gemfield Bridge: staff who run the developer ticket control panel.
// Management/admins inherit access; 'gemfield_developer' is the dedicated seed role.
const GEMFIELD_DEV_ROLES = new Set([
  ...MANAGEMENT_ACCESS_ROLES,
  'gemfield_developer',
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
  allowedRoles: ReadonlySet<string>,
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

export function isDisbursementSignerRoleName(role?: string | null): boolean {
  return DISBURSEMENT_SIGNER_ROLES.has(normalizeOrgRoleName(role))
}

export function hasDisbursementSignerAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasAccessRole(roles, DISBURSEMENT_SIGNER_ROLES, isConfiguredAdminEmail)
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

export function isGemfieldDevRoleName(role?: string | null): boolean {
  return GEMFIELD_DEV_ROLES.has(normalizeOrgRoleName(role))
}

export function hasGemfieldDevAccess(
  roles: OrgRoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasAccessRole(roles, GEMFIELD_DEV_ROLES, isConfiguredAdminEmail)
}
