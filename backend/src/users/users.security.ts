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

    sanitized[key] = value
  })

  return sanitized
}

export function sanitizeUsersForDirectory<T extends AnyRecord>(users: T[]): AnyRecord[] {
  return users.map(sanitizeUserForDirectory)
}
