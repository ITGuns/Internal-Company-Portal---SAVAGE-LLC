/**
 * Pure helpers for member deactivation and hard delete.
 * No runtime imports so node --test can load this file directly.
 */

export function isInactiveMember(status?: string | null): boolean {
  return String(status || "").toLowerCase() === "inactive";
}

/**
 * The phrase an admin must type before a hard delete. Uses the email because
 * names are not unique.
 */
export function getHardDeleteConfirmationPhrase(email?: string | null): string {
  const normalized = String(email || "").trim().toLowerCase();
  return normalized ? `delete ${normalized}` : "delete";
}

export function isHardDeleteConfirmed(typed: string, email?: string | null): boolean {
  return typed.trim().toLowerCase() === getHardDeleteConfirmationPhrase(email);
}
