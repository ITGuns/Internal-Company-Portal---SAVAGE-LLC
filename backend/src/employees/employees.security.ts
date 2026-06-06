import {
  hasManagementAccess,
  normalizeOrgRoleName,
} from '../org/org-access-policy'

type RoleLike = {
  role?: string | null
  department?: {
    name?: string | null
  } | null
}

type EmployeeProfileLike = {
  jobTitle?: string | null
  employmentType?: string | null
  baseSalary?: number | null
  bankAccount?: string | null
  taxId?: string | null
  currency?: string | null
  paymentFrequency?: string | null
}

type EmployeeLike = {
  id: string
  email?: string | null
  name?: string | null
  avatar?: string | null
  status?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  citizenship?: string | null
  birthday?: Date | string | null
  appliedDate?: Date | string | null
  role?: string | null
  department?: string | null
  salary?: number | null
  hoursThisWeek?: number | null
  performance?: number | null
  employeeProfile?: EmployeeProfileLike | null
  roles?: RoleLike[]
  password?: string | null
  passwordResetToken?: string | null
  passwordResetExpiry?: Date | string | null
}

export function normalizeEmployeeRoleName(role?: string | null): string {
  return normalizeOrgRoleName(role)
}

export function hasEmployeeManagementAccess(
  roles: RoleLike[] = [],
  isConfiguredAdminEmail = false,
): boolean {
  if (isConfiguredAdminEmail) return true

  return hasManagementAccess(roles)
}

function serializeDate(value?: Date | string | null): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : value
}

export function serializeEmployeeApplication(employee: EmployeeLike) {
  return {
    id: employee.id,
    email: employee.email ?? null,
    name: employee.name ?? null,
    avatar: employee.avatar ?? null,
  }
}

export function serializeDeployedEmployee(employee: EmployeeLike) {
  const primaryRole = employee.roles?.[0]

  return {
    id: employee.id,
    email: employee.email ?? '',
    name: employee.name ?? '',
    avatar: employee.avatar ?? null,
    status: employee.status ?? 'active',
    phone: employee.phone ?? null,
    address: employee.address ?? null,
    city: employee.city ?? null,
    citizenship: employee.citizenship ?? null,
    birthday: serializeDate(employee.birthday) ?? null,
    appliedDate: serializeDate(employee.appliedDate) ?? null,
    role: employee.role || employee.employeeProfile?.jobTitle || primaryRole?.role || 'Member',
    department: employee.department || primaryRole?.department?.name || 'Operations',
    salary: employee.salary ?? employee.employeeProfile?.baseSalary ?? 0,
    hoursThisWeek: employee.hoursThisWeek ?? 0,
    performance: employee.performance ?? null,
  }
}

export function serializeEmployeesForManagement(employees: EmployeeLike[]) {
  return employees.map(serializeDeployedEmployee)
}
