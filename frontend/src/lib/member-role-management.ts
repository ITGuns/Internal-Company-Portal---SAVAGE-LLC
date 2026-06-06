import {
  hasClientOperationsAccess,
  hasClientPortalAccess,
  hasFullAccess,
  hasManagementAccess,
  hasPayrollManagementAccess,
  type RoleAccessUser,
} from "./role-access";

export interface MemberRoleAssignment {
  id?: string;
  role: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface MemberAvailableRole {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface OperationsMember extends RoleAccessUser {
  id: string;
  email: string;
  name?: string | null;
  status?: string | null;
  isApproved?: boolean | null;
  roles?: MemberRoleAssignment[];
  employeeProfile?: {
    jobTitle?: string | null;
    employmentType?: string | null;
  } | null;
}

export function getMemberDisplayName(member: Pick<OperationsMember, "email" | "name">): string {
  return member.name?.trim() || member.email;
}

export function getMemberRoleLabel(role: Pick<MemberRoleAssignment, "role" | "department">): string {
  return role.department?.name ? `${role.role} - ${role.department.name}` : role.role;
}

export function buildMemberRoleAssignmentPayload(
  roleId: string,
  availableRoles: MemberAvailableRole[],
): { role: string; departmentId?: string } {
  const selectedRole = availableRoles.find((role) => role.id === roleId);
  if (!selectedRole) {
    throw new Error("Select a valid role before saving.");
  }

  return {
    role: selectedRole.name,
    ...(selectedRole.departmentId ? { departmentId: selectedRole.departmentId } : {}),
  };
}

export function buildMemberRoleRemovalEndpoint(
  userId: string,
  assignment: Pick<MemberRoleAssignment, "role" | "departmentId">,
): string {
  const params = new URLSearchParams();
  if (assignment.departmentId) params.set("departmentId", assignment.departmentId);

  const query = params.toString();
  const endpoint = `/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(assignment.role)}`;
  return query ? `${endpoint}?${query}` : endpoint;
}

export function getMemberAuthorizationLabels(member: RoleAccessUser): string[] {
  const labels: string[] = [];

  if (hasFullAccess(member)) labels.push("Full access");
  if (hasManagementAccess(member)) labels.push("Management");
  if (hasPayrollManagementAccess(member)) labels.push("Payroll");
  if (hasClientOperationsAccess(member)) labels.push("Client ops");
  if (hasClientPortalAccess(member)) labels.push("Client portal");

  return labels.length > 0 ? labels : ["No active authorization"];
}
