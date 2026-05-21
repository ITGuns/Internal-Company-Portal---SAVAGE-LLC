export interface TaskRoleAssignment {
  role: string
  departmentId?: string | null
  department?: {
    id: string
    name: string
  } | null
}

export interface PrimaryTaskAssignment {
  role: string
  departmentId: string
  departmentName?: string
}

export interface TaskAccessPolicy {
  requesterId: string
  isPrivileged: boolean
}

export interface ReadableTask {
  assigneeId?: string | null
  createdById?: string | null
}

const TASK_ASSIGNMENT_PRIVILEGED_ROLES = new Set([
  'admin',
  'manager',
  'operations_manager',
  'chief_operations_officer',
])

export function normalizeRoleName(role: string): string {
  return role.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function hasTaskAssignmentPrivilege(roles: TaskRoleAssignment[]): boolean {
  return roles.some((role) => TASK_ASSIGNMENT_PRIVILEGED_ROLES.has(normalizeRoleName(role.role)))
}

export function getPrimaryTaskAssignment(roles: TaskRoleAssignment[]): PrimaryTaskAssignment | null {
  const rolesWithDepartment = roles.filter((assignment) => assignment.role && assignment.departmentId)
  if (rolesWithDepartment.length === 0) return null

  const primary =
    rolesWithDepartment.find((assignment) => !TASK_ASSIGNMENT_PRIVILEGED_ROLES.has(normalizeRoleName(assignment.role))) ||
    rolesWithDepartment[0]

  if (!primary.departmentId) return null

  return {
    role: primary.role,
    departmentId: primary.departmentId,
    departmentName: primary.department?.name,
  }
}

export function getTaskVisibilityFilter(access: TaskAccessPolicy): { OR?: Array<{ assigneeId?: string; createdById?: string }> } {
  if (access.isPrivileged) return {}
  return {
    OR: [
      { assigneeId: access.requesterId },
      { createdById: access.requesterId },
    ],
  }
}

export function canReadTask(access: TaskAccessPolicy, task: ReadableTask): boolean {
  return access.isPrivileged || task.assigneeId === access.requesterId || task.createdById === access.requesterId
}

export function canRequestAssigneeTasks(access: TaskAccessPolicy, assigneeId: string): boolean {
  return access.isPrivileged || assigneeId === access.requesterId
}
