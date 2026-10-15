/**
 * Admin password reset helpers (POST /users/:id/reset-password, same roles as
 * Deactivate). The rules and wording mirror memberPasswordError in
 * backend/src/users/users.service.ts. No runtime imports so node --test can
 * load this file directly.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const GENERATED_PASSWORD_LENGTH = 12;

// Letters and digits without look-alikes (0 O o, 1 l I), so a password read out
// loud or copied from a chat message is not misread.
export const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ" + "abcdefghijkmnpqrstuvwxyz" + "23456789";

export interface ResetPasswordForm {
  password: string;
  confirm: string;
}

export type ResetPasswordErrors = Partial<Record<keyof ResetPasswordForm, string>>;

/** The server's rules for a password an admin sets. Returns null when it is acceptable. */
export function getPasswordProblem(password: string, email?: string | null): string | null {
  if (!password) return "New password is required";
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  if (email && password.toLowerCase() === email.toLowerCase()) {
    return "Password must not be the same as the email address";
  }
  return null;
}

export function validateResetPasswordForm(form: ResetPasswordForm, email?: string | null): ResetPasswordErrors {
  const errors: ResetPasswordErrors = {};
  const problem = getPasswordProblem(form.password, email);
  if (problem) errors.password = problem;
  if (!form.confirm) errors.confirm = "Type the new password again";
  else if (form.confirm !== form.password) errors.confirm = "The two passwords do not match";
  return errors;
}

/** Fills the array with cryptographically strong random bytes and returns it. */
export type FillRandom = (bytes: Uint8Array) => Uint8Array;

const webCryptoRandom: FillRandom = (bytes) => globalThis.crypto.getRandomValues(bytes);

const hasEveryCharacterKind = (password: string) =>
  /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);

/**
 * A random 12 character password from PASSWORD_ALPHABET with at least one
 * uppercase letter, one lowercase letter and one digit, so it always passes
 * the server rules. Bytes that would favour some characters are skipped.
 */
export function generatePassword(fillRandom: FillRandom = webCryptoRandom): string {
  const unbiasedLimit = 256 - (256 % PASSWORD_ALPHABET.length);
  for (let attempt = 0; attempt < 100; attempt++) {
    let password = "";
    while (password.length < GENERATED_PASSWORD_LENGTH) {
      for (const byte of fillRandom(new Uint8Array(GENERATED_PASSWORD_LENGTH * 2))) {
        if (byte < unbiasedLimit && password.length < GENERATED_PASSWORD_LENGTH) {
          password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
        }
      }
    }
    if (hasEveryCharacterKind(password)) return password;
  }
  throw new Error("Could not generate a password. Type one instead.");
}
