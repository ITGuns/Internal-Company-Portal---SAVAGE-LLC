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

export function isClientPortalPath(pathname: string): boolean {
  return pathname === "/client" || pathname.startsWith("/client/");
}

export function isClientPortalRouteAllowed(
  user: RoleAccessUser | null | undefined,
  pathname: string,
): boolean {
  if (!hasClientPortalAccess(user)) return true;
  return isClientPortalPath(pathname);
}

// Roles a bare, auto-approved account carries by default (nothing assigned yet).
const FREE_TIER_BASE_ROLES = new Set(["member", "user", "guest"]);

// A "free tier" account is an auto-approved sign-up (e.g. first Google login)
// with no role beyond the default member — not an employee, client, or manager.
// Used to show the upsell CTA and hide internal-only features (File Directory,
// Messages & Chat) that a bare account shouldn't have.
export function isFreeTierUser(user?: RoleAccessUser | null): boolean {
  if (!user) return false;
  const roles = getUserRoleNames(user);
  return roles.length === 0 || roles.every((role) => FREE_TIER_BASE_ROLES.has(role));
}
