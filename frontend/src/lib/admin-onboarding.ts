import { apiFetch } from "./api";

export interface AdminOnboardingRole {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface AdminOnboardingForm {
  email: string;
  roleId: string;
}

export interface AdminOnboardingResult {
  user: {
    id: string;
    email: string;
    name?: string | null;
    status?: string;
    isApproved?: boolean;
  };
  onboarding: {
    setupUrl: string;
    expiresAt: string;
    role: AdminOnboardingRole;
  };
}

export function normalizeOnboardingEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getOnboardingRoleLabel(role: AdminOnboardingRole): string {
  return role.department?.name ? `${role.name} - ${role.department.name}` : `${role.name} - Global`;
}

export function canSubmitOnboardingInvite(form: AdminOnboardingForm): boolean {
  return normalizeOnboardingEmail(form.email).length > 0 && form.roleId.trim().length > 0;
}

export async function createUserOnboardingInvitation(
  form: AdminOnboardingForm,
): Promise<AdminOnboardingResult> {
  const response = await apiFetch("/users/onboarding-invitations", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeOnboardingEmail(form.email),
      roleId: form.roleId,
    }),
  });

  return response.json();
}
