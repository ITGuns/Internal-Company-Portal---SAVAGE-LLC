import {
  hasManagementAccess as hasOrgManagementAccess,
  hasPayrollManagementAccess as hasOrgPayrollManagementAccess,
  MANAGEMENT_ACCESS_ROLES,
  normalizeOrgRoleName,
  PAYROLL_MANAGEMENT_ROLES,
} from '../org/org-access-policy'

export interface RoleLike {
  role?: string | null
}

export interface PayrollAccess {
  requesterId: string
  /** Payroll-management access: edit time entries directly, backfill hours, manage payslips. */
  isPrivileged: boolean
  /** Management or payroll roles: review overtime and correction requests (payroll v2). */
  canReviewTime?: boolean
  /** Full-access roles (admin, owner): may also backfill hours for deactivated members. */
  isFullAccess?: boolean
}

export interface PayrollProfileFilterResult {
  data: Record<string, unknown>
  rejectedFields: string[]
}

const PAYROLL_PROFILE_UPDATE_FIELDS = new Set([
  'jobTitle',
  'employmentType',
  'baseSalary',
  'currency',
  'paymentFrequency',
  'payrollScheme',
  'maxBillableHoursPerDay',
  'payBasis',
  'hourlyRate',
  'overtimeMultiplier',
  'bankAccount',
  'taxId',
])

const PROTECTED_PAYROLL_PROFILE_FIELDS = new Set([
  'jobTitle',
  'employmentType',
  'baseSalary',
  'currency',
  'paymentFrequency',
  'payrollScheme',
  'maxBillableHoursPerDay',
  'payBasis',
  'hourlyRate',
  'overtimeMultiplier',
  'bankAccount',
  'taxId',
])

export function normalizePayrollRoleName(role?: string | null): string {
  return normalizeOrgRoleName(role)
}

export function hasPayrollManagementAccess(
  roles: RoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  if (isConfiguredAdminEmail) return true

  return hasOrgPayrollManagementAccess(roles)
}

/**
 * Roles allowed to review overtime and adjustment requests:
 * MANAGEMENT_ACCESS_ROLES or PAYROLL_MANAGEMENT_ROLES. Editing time entries
 * directly needs payroll-management access (hasPayrollManagementAccess).
 * Mirrored in frontend/src/lib/role-access.ts.
 */
export function canReviewTimeRequests(
  roles: RoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  return hasOrgManagementAccess(roles, isConfiguredAdminEmail)
    || hasOrgPayrollManagementAccess(roles, isConfiguredAdminEmail)
}

/**
 * Route-level role list for requireRole on payroll-management routes. Derived
 * from org-access-policy so it cannot drift from hasPayrollManagementAccess.
 */
export const PAYROLL_MANAGEMENT_ROUTE_ROLES: readonly string[] = [...PAYROLL_MANAGEMENT_ROLES]

/** Route-level role list for requireRole on time-review routes (management or payroll). */
export const TIME_REVIEW_ROUTE_ROLES: readonly string[] = [
  ...new Set([...PAYROLL_MANAGEMENT_ROLES, ...MANAGEMENT_ACCESS_ROLES]),
]

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
