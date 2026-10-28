export interface SignupRoleOption {
  id: string;
  name: string;
  departmentId?: string | null;
}

export interface SignupDepartmentOption {
  id: string;
  name: string;
  availableRoles?: SignupRoleOption[];
}

// Roles Operations assigns and nobody requests at signup (review fix 2026-10-28).
// Mirrors NON_REQUESTABLE_SIGNUP_ROLES in backend/src/org/org-access-policy.ts,
// which refuses them on POST /auth/signup.
const NON_REQUESTABLE_SIGNUP_ROLES = new Set(["disbursement_officer"]);

function normalizeRoleKey(name: string): string {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getSignupRoleOptions(
  departments: SignupDepartmentOption[],
  departmentId: string,
): SignupRoleOption[] {
  if (!departmentId) return [];

  const selectedDepartment = departments.find(
    (department) => String(department.id) === String(departmentId),
  );

  return (selectedDepartment?.availableRoles || []).filter(
    (role) => !NON_REQUESTABLE_SIGNUP_ROLES.has(normalizeRoleKey(role.name)),
  );
}
