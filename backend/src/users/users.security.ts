type AnyRecord = Record<string, any>

const SENSITIVE_USER_FIELDS = new Set([
  'password',
  'passwordResetToken',
  'passwordResetExpiry',
])

const PUBLIC_EMPLOYEE_PROFILE_FIELDS = new Set([
  'jobTitle',
  'employmentType',
])

const PUBLIC_DIRECTORY_USER_FIELDS = new Set([
  'id',
  'email',
  'name',
  'avatar',
  'managerId',
  'status',
  'isApproved',
  'createdAt',
  'updatedAt',
])

export function sanitizeUserForDirectory<T extends AnyRecord>(user: T): AnyRecord {
  const sanitized: AnyRecord = {}

  Object.entries(user).forEach(([key, value]) => {
    if (SENSITIVE_USER_FIELDS.has(key)) return

    if (key === 'employeeProfile' && value && typeof value === 'object') {
      sanitized.employeeProfile = Object.fromEntries(
        Object.entries(value).filter(([profileKey]) => PUBLIC_EMPLOYEE_PROFILE_FIELDS.has(profileKey)),
      )
      return
    }

    if (key === 'roles' && Array.isArray(value)) {
      sanitized.roles = value.map((assignment) => ({
        id: assignment.id,
        role: assignment.role,
        departmentId: assignment.departmentId,
        department: assignment.department
          ? {
              id: assignment.department.id,
              name: assignment.department.name,
            }
          : null,
      }))
      return
    }

    if (key === 'manager' && value && typeof value === 'object') {
      sanitized.manager = {
        id: value.id,
        email: value.email,
        name: value.name,
        avatar: value.avatar,
      }
      return
    }

    if (PUBLIC_DIRECTORY_USER_FIELDS.has(key)) {
      sanitized[key] = value
    }
  })

  return sanitized
}

export function sanitizeUsersForDirectory<T extends AnyRecord>(users: T[]): AnyRecord[] {
  return users.map(sanitizeUserForDirectory)
}
