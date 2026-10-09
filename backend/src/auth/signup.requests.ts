export interface PendingSignupRequest {
  role?: string | null
  departmentId?: string | null
}

export interface PendingSignupProfileData {
  jobTitle?: string | null
  requestedRole?: string | null
  requestedDepartmentId?: string | null
}

export interface LoginApprovalState {
  status?: string | null
  isApproved?: boolean | null
}

export function buildPendingSignupProfile(request: PendingSignupRequest): PendingSignupProfileData {
  const role = request.role?.trim() || null
  const departmentId = request.departmentId?.trim() || null

  return {
    jobTitle: role,
    requestedRole: role,
    requestedDepartmentId: departmentId,
  }
}

export function getApprovedRoleAssignment(profile?: PendingSignupProfileData | null) {
  const role = profile?.requestedRole?.trim() || profile?.jobTitle?.trim() || null
  const departmentId = profile?.requestedDepartmentId?.trim() || null

  if (!role || !departmentId) return null

  return {
    role,
    departmentId,
  }
}

export class MissingSignupRoleAssignmentError extends Error {
  constructor() {
    super('Pending employee is missing a requested role or department')
    this.name = 'MissingSignupRoleAssignmentError'
  }
}

export function requireApprovedRoleAssignment(profile?: PendingSignupProfileData | null) {
  const assignment = getApprovedRoleAssignment(profile)

  if (!assignment) {
    throw new MissingSignupRoleAssignmentError()
  }

  return assignment
}

export const INACTIVE_ACCOUNT_MESSAGE = 'This account is deactivated. Contact an administrator.'
export const PENDING_ACCOUNT_MESSAGE = 'Account pending approval'

/** Deactivated members (payroll v2, Rule 6) keep their data but cannot sign in. */
export function isInactiveUser(user: LoginApprovalState): boolean {
  return user.status === 'inactive'
}

export function canLoginApprovedUser(user: LoginApprovalState): boolean {
  return user.isApproved === true && user.status !== 'pending' && !isInactiveUser(user)
}

/** Message for a refused login, refresh or request. */
export function getLoginRefusalMessage(user: LoginApprovalState): string {
  return isInactiveUser(user) ? INACTIVE_ACCOUNT_MESSAGE : PENDING_ACCOUNT_MESSAGE
}

/**
 * Initial state for an account first seen through OAuth (Rule 7). Only emails in
 * ADMIN_EMAILS are approved on sight; everyone else waits for an admin.
 */
export function getOAuthNewUserState(isConfiguredAdminEmail: boolean): { status: string; isApproved: boolean } {
  return isConfiguredAdminEmail
    ? { status: 'verified', isApproved: true }
    : { status: 'pending', isApproved: false }
}
