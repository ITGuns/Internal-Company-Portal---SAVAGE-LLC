export interface RoleAccessUser {
  role?: string | null;
  roles?: Array<string | null | undefined> | null;
}

const MANAGEMENT_ROLES = new Set([
  "admin",
  "administrator",
  "manager",
  "operations_manager",
  "chief_operations_officer",
]);

const CLIENT_PORTAL_ROLES = new Set([
  "client",
  "client_owner",
  "client_admin",
  "client_member",
]);

export function normalizeRoleName(role?: string | null): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function getUserRoleNames(user?: RoleAccessUser | null): string[] {
  if (!user) return [];

  return [user.role, ...(user.roles || [])]
    .map(normalizeRoleName)
    .filter(Boolean);
}

export function hasManagementAccess(user?: RoleAccessUser | null): boolean {
  return getUserRoleNames(user).some((role) => MANAGEMENT_ROLES.has(role));
}

export function hasClientOperationsAccess(user?: RoleAccessUser | null): boolean {
  return hasManagementAccess(user);
}

export function hasClientPortalAccess(user?: RoleAccessUser | null): boolean {
  const roles = getUserRoleNames(user);
  return roles.some((role) => CLIENT_PORTAL_ROLES.has(role)) && !hasClientOperationsAccess(user);
}

export function hasClientWorkspaceShellAccess(
  user?: RoleAccessUser | null,
  hasClientWorkspace = false,
): boolean {
  return !hasClientOperationsAccess(user) && (hasClientPortalAccess(user) || hasClientWorkspace);
}

export function getAuthenticatedLandingPath(
  user?: RoleAccessUser | null,
  hasClientWorkspace = false,
): "/client" | "/dashboard" {
  return hasClientWorkspaceShellAccess(user, hasClientWorkspace) ? "/client" : "/dashboard";
}
