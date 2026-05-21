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

export function canLoginApprovedUser(user: LoginApprovalState): boolean {
  return user.isApproved === true && user.status !== 'pending'
}
