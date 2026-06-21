import { DEFAULT_SIGNUP_ROLE_OPTIONS } from '../org/org-access-policy'

export { DEFAULT_SIGNUP_ROLE_OPTIONS }

export interface SignupRoleOption {
  id: string
  name: string
  departmentId: string | null
  createdAt: Date
  department?: {
    id: string
    name: string
  } | null
}

export interface SignupDepartmentWithRoles {
  id: string
  name: string
  availableRoles?: SignupRoleOption[]
}

export interface SignupRoleAvailability {
  departmentId?: string | null
}

export function normalizeSignupOption(value?: string | null): string {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function roleIdSlug(value: string): string {
  return normalizeSignupOption(value).replace(/[^a-z0-9]+/g, '-')
}

export function buildDefaultSignupRoleId(departmentId: string, roleName: string): string {
  return `default:${departmentId}:${roleIdSlug(roleName)}`
}

export function isDefaultSignupRoleId(roleId?: string | null): boolean {
  return typeof roleId === 'string' && roleId.startsWith('default:')
}

export function getDefaultSignupRoles(departmentName?: string | null): string[] {
  const normalizedDepartment = normalizeSignupOption(departmentName)
  const match = Object.entries(DEFAULT_SIGNUP_ROLE_OPTIONS).find(
    ([name]) => normalizeSignupOption(name) === normalizedDepartment,
  )

  return match ? [...match[1]] : []
}

export function isDefaultSignupRoleAllowed(departmentName: string, role: string): boolean {
  const normalizedRole = normalizeSignupOption(role)
  return getDefaultSignupRoles(departmentName).some(
    (allowedRole) => normalizeSignupOption(allowedRole) === normalizedRole,
  )
}

export function hasConfiguredSignupRolesForDepartment(
  availableRoles: SignupRoleAvailability[],
  departmentId: string,
): boolean {
  return availableRoles.some((role) => role.departmentId === departmentId)
}

export function mergeSignupRolesForDepartment(
  department: SignupDepartmentWithRoles,
): SignupRoleOption[] {
  const departmentSummary = { id: department.id, name: department.name }
  const configuredRoles = (department.availableRoles || []).map((role) => ({
    ...role,
    department: role.department || departmentSummary,
  }))
  const configuredRoleNames = new Set(
    configuredRoles.map((role) => normalizeSignupOption(role.name)),
  )

  const missingDefaultRoles = getDefaultSignupRoles(department.name)
    .filter((name) => !configuredRoleNames.has(normalizeSignupOption(name)))
    .map((name) => ({
      id: buildDefaultSignupRoleId(department.id, name),
      name,
      departmentId: department.id,
      department: departmentSummary,
      createdAt: new Date(0),
    }))

  return [...configuredRoles, ...missingDefaultRoles]
}

export function findMergedSignupRoleById(
  departments: SignupDepartmentWithRoles[],
  roleId: string,
): SignupRoleOption | null {
  for (const department of departments) {
    const role = mergeSignupRolesForDepartment(department).find(
      (candidate) => candidate.id === roleId,
    )
    if (role) return role
  }

  return null
}
