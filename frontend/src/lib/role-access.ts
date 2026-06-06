export interface RoleAccessUser {
  role?: string | null;
  roles?: Array<string | { role?: string | null } | null | undefined> | null;
}

const FULL_ACCESS_ROLES = new Set([
  "admin",
  "administrator",
  "owner",
  "founder",
  "owner_founder",
  "owners_founders",
  "overlord",
]);

const MANAGEMENT_ROLES = new Set([
  ...FULL_ACCESS_ROLES,
  "manager",
  "project_manager",
  "operations_manager",
  "chief_operations_officer",
]);

const PAYROLL_MANAGEMENT_ROLES = new Set([
  ...FULL_ACCESS_ROLES,
  "operations_manager",
  "bookkeeper",
  "bookkeeping",
  "contractor_salary_payments",
  "financial_controller",
  "payroll_assistant",
  "payroll_finance",
]);

const CLIENT_OPERATIONS_ROLES = new Set([
  ...MANAGEMENT_ROLES,
  "web_developer",
  "website_developer",
  "webdev",
  "frontend_developer",
  "backend_technical_developer",
  "lead_frontend_developer",
  "senior_backend_developer",
  "full_stack_developer",
  "ui_ux_designer",
  "app_developer",
  "web_development_assistant",
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
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getUserRoleNames(user?: RoleAccessUser | null): string[] {
  if (!user) return [];

  return [
    user.role,
    ...(user.roles || []).map((role) => (typeof role === "string" ? role : role?.role)),
  ]
    .map(normalizeRoleName)
    .filter(Boolean);
}

export function hasFullAccess(user?: RoleAccessUser | null): boolean {
  return getUserRoleNames(user).some((role) => FULL_ACCESS_ROLES.has(role));
}

export function hasManagementAccess(user?: RoleAccessUser | null): boolean {
  return getUserRoleNames(user).some((role) => MANAGEMENT_ROLES.has(role));
}

export function hasPayrollManagementAccess(user?: RoleAccessUser | null): boolean {
  return getUserRoleNames(user).some((role) => PAYROLL_MANAGEMENT_ROLES.has(role));
}

export function hasClientOperationsAccess(user?: RoleAccessUser | null): boolean {
  return getUserRoleNames(user).some((role) => CLIENT_OPERATIONS_ROLES.has(role));
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
