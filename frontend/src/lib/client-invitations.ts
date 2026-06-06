import type { ClientInviteResult } from "./client-portal";

export interface ClientInviteFormState {
  email: string;
  name: string;
  role: string;
  status: string;
}

export const emptyClientInviteForm: ClientInviteFormState = {
  email: "",
  name: "",
  role: "client_member",
  status: "active",
};

export function createClientInvitePayload(form: ClientInviteFormState) {
  const email = form.email.trim().toLowerCase();
  const name = form.name.trim();

  return {
    email,
    ...(name ? { name } : {}),
    role: form.role || emptyClientInviteForm.role,
    status: form.status || emptyClientInviteForm.status,
  };
}

export function canSubmitClientInvite(form: ClientInviteFormState): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
}

export function getClientInviteDeliveryLabel(result: ClientInviteResult): string {
  if (result.invite.emailSent) return "Setup email sent";
  if (result.invite.setupUrl) return "Setup link ready";
  if (!result.invite.setupRequired) return "Existing client user added";
  return "Invite created";
}
