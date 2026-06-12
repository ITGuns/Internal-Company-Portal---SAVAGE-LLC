import {
  hasManagementAccess,
  isManagementRoleName,
  normalizeOrgRoleName,
} from '../org/org-access-policy'

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
  collaborators?: Array<{
    userId?: string | null
    status?: string | null
  }> | null
  assigneeIds?: unknown
}

const READABLE_COLLABORATOR_STATUSES = ['invited', 'accepted']
const READABLE_COLLABORATOR_STATUS_SET = new Set(READABLE_COLLABORATOR_STATUSES)

export function normalizeRoleName(role: string): string {
  return normalizeOrgRoleName(role)
}

export function hasTaskAssignmentPrivilege(roles: TaskRoleAssignment[]): boolean {
  return hasManagementAccess(roles)
}

export function getPrimaryTaskAssignment(roles: TaskRoleAssignment[]): PrimaryTaskAssignment | null {
  const rolesWithDepartment = roles.filter((assignment) => assignment.role && assignment.departmentId)
  if (rolesWithDepartment.length === 0) return null

  const primary =
    rolesWithDepartment.find((assignment) => !isManagementRoleName(assignment.role)) ||
    rolesWithDepartment[0]

  if (!primary.departmentId) return null

  return {
    role: primary.role,
    departmentId: primary.departmentId,
    departmentName: primary.department?.name,
  }
}

export function getTaskVisibilityFilter(access: TaskAccessPolicy): { OR?: Array<Record<string, unknown>> } {
  if (access.isPrivileged) return {}
  return {
    OR: [
      { assigneeId: access.requesterId },
      { createdById: access.requesterId },
      {
        collaborators: {
          some: {
            userId: access.requesterId,
            status: { in: READABLE_COLLABORATOR_STATUSES },
          },
        },
      },
      {
        assigneeIds: {
          path: [],
          array_contains: access.requesterId,
        },
      },
    ],
  }
}

export function canReadTask(access: TaskAccessPolicy, task: ReadableTask): boolean {
  return access.isPrivileged
    || task.assigneeId === access.requesterId
    || task.createdById === access.requesterId
    || Boolean(task.collaborators?.some((collaborator) =>
      collaborator.userId === access.requesterId
      && READABLE_COLLABORATOR_STATUS_SET.has(collaborator.status || ''),
    ))
    || (Array.isArray(task.assigneeIds) && task.assigneeIds.includes(access.requesterId))
}

export function canRequestAssigneeTasks(access: TaskAccessPolicy, assigneeId: string): boolean {
  return access.isPrivileged || assigneeId === access.requesterId
}
