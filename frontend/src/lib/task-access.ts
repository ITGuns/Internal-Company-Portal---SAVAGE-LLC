export interface RoleAssignment {
  role?: string | null;
  departmentId?: string | null;
  department?: {
    id?: string | null;
    name?: string | null;
  } | null;
}

export interface TaskAccessUser {
  id?: string | number | null;
  role?: string | null;
  roles?: Array<string | RoleAssignment> | null;
  department?: string | null;
}

export interface TaskAssignmentDefaults {
  role: string;
  departmentId?: string;
  departmentName?: string;
}

const TASK_ASSIGNMENT_PRIVILEGED_ROLES = new Set([
  "admin",
  "administrator",
  "manager",
  "project_manager",
  "operations_manager",
  "chief_operations_officer",
  "owner_founder",
  "owners_founders",
  "owner",
  "founder",
  "overlord",
]);

export function normalizeRoleName(role: string): string {
  return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function canManageTaskAssignments(user: TaskAccessUser | null | undefined): boolean {
  if (!user) return false;

  const roleNames = [
    user.role,
    ...(user.roles || []).map((role) => (typeof role === "string" ? role : role.role)),
  ].filter((role): role is string => Boolean(role));

  return roleNames.some((role) => TASK_ASSIGNMENT_PRIVILEGED_ROLES.has(normalizeRoleName(role)));
}

export function getPrimaryTaskAssignmentFromRoles(
  roles: Array<string | RoleAssignment> | null | undefined,
): TaskAssignmentDefaults | null {
  const structuredRoles = (roles || []).filter(
    (role): role is RoleAssignment => typeof role !== "string" && Boolean(role.role),
  );

  const rolesWithDepartment = structuredRoles.filter((role) => role.departmentId);
  if (rolesWithDepartment.length === 0) return null;

  const primary =
    rolesWithDepartment.find((role) => !TASK_ASSIGNMENT_PRIVILEGED_ROLES.has(normalizeRoleName(role.role || ""))) ||
    rolesWithDepartment[0];

  if (!primary.role) return null;

  return {
    role: primary.role,
    departmentId: primary.departmentId || undefined,
    departmentName: primary.department?.name || undefined,
  };
}

export function getUserTaskAssignment(
  currentUser: TaskAccessUser | null | undefined,
  users: TaskAccessUser[],
): TaskAssignmentDefaults | null {
  if (!currentUser?.id) return null;

  const matchingUser = users.find((user) => String(user.id) === String(currentUser.id));
  const assignmentFromUserRecord = getPrimaryTaskAssignmentFromRoles(matchingUser?.roles);
  if (assignmentFromUserRecord) return assignmentFromUserRecord;

  const assignmentFromCurrentUser = getPrimaryTaskAssignmentFromRoles(currentUser.roles);
  if (assignmentFromCurrentUser) return assignmentFromCurrentUser;

  if (currentUser.role) {
    return {
      role: currentUser.role,
      departmentName: currentUser.department || undefined,
    };
  }

  return null;
}
