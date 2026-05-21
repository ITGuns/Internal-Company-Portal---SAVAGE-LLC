export const DEFAULT_SIGNUP_ROLE_OPTIONS: Record<string, string[]> = {
  'Website Developers': [
    'Lead Frontend Developer',
    'Senior Backend Developer',
    'Full Stack Developer',
    'UI/UX Designer',
    'App Developer',
    'Web Development Assistant',
  ],
  'Operations Manager': [
    'Operations Manager',
    'Operations Assistant',
    'Fulfillment Specialist',
    'Logistics Coordinator',
    'Inventory VA',
    'Customer Experience (CX) VA',
  ],
  'Payroll / Finance': [
    'Financial Controller',
    'Bookkeeper',
    'Payroll Assistant',
    'Contractor & Salary Payments',
  ],
  'Digital Marketing Lead / Marketing VA': [
    'Digital Marketing Lead',
    'Marketing Assistant',
    'Marketing VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA',
  ],
  'Analytics / Data VA': [
    'Data Analyst',
    'Analytics Specialist',
    'Data VA',
    'Analytics Assistant',
  ],
  'Automation / Tech VA': [
    'Automation Specialist',
    'Tech VA',
    'Integration Expert',
    'Automation Assistant',
  ],
  'Project Managers': [
    'Project Manager',
    'Project Assistant',
    'Team Lead',
    'SCRUM Master',
  ],
}

export interface SignupRoleOption {
  id: string
  name: string
  departmentId: string | null
  createdAt: Date
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
  const configuredRoles = department.availableRoles || []
  if (configuredRoles.length > 0) return configuredRoles

  return getDefaultSignupRoles(department.name).map((name) => ({
    id: `default:${department.id}:${normalizeSignupOption(name).replace(/[^a-z0-9]+/g, '-')}`,
    name,
    departmentId: department.id,
    createdAt: new Date(0),
  }))
}
