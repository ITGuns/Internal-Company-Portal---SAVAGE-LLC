export interface RoleLike {
  role?: string | null
}

export interface PayrollAccess {
  requesterId: string
  isPrivileged: boolean
}

export interface PayrollProfileFilterResult {
  data: Record<string, unknown>
  rejectedFields: string[]
}

const PAYROLL_MANAGEMENT_ROLES = new Set([
  'admin',
  'administrator',
  'manager',
  'operations_manager',
])

const PAYROLL_PROFILE_UPDATE_FIELDS = new Set([
  'jobTitle',
  'employmentType',
  'baseSalary',
  'currency',
  'paymentFrequency',
  'bankAccount',
  'taxId',
])

const PROTECTED_PAYROLL_PROFILE_FIELDS = new Set([
  'jobTitle',
  'employmentType',
  'baseSalary',
  'currency',
  'paymentFrequency',
  'bankAccount',
  'taxId',
])

export function normalizePayrollRoleName(role?: string | null): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export function hasPayrollManagementAccess(
  roles: RoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  if (isConfiguredAdminEmail) return true

  return roles.some((role) =>
    PAYROLL_MANAGEMENT_ROLES.has(normalizePayrollRoleName(role.role)),
  )
}

export function canAccessPayrollTarget(access: PayrollAccess, targetUserId: string): boolean {
  return access.isPrivileged || access.requesterId === targetUserId
}

export function getProtectedPayrollProfileFields(payload: Record<string, unknown>): string[] {
  return Object.keys(payload).filter((field) => PROTECTED_PAYROLL_PROFILE_FIELDS.has(field))
}

export function filterPayrollProfileUpdate(
  payload: Record<string, unknown>,
  options: { isPrivileged: boolean },
): PayrollProfileFilterResult {
  const rejectedFields = options.isPrivileged
    ? []
    : getProtectedPayrollProfileFields(payload)
  const data: Record<string, unknown> = {}

  if (options.isPrivileged) {
    Object.entries(payload).forEach(([field, value]) => {
      if (PAYROLL_PROFILE_UPDATE_FIELDS.has(field)) {
        data[field] = value
      }
    })
  }

  return {
    data,
    rejectedFields,
  }
}
