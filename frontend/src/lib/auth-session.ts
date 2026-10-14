import { STORAGE_KEYS } from './constants';

export const AUTH_SESSION_CLEARED_EVENT = 'mydeskii:auth-session-cleared';
export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';
// Mirrors backend INACTIVE_ACCOUNT_MESSAGE (backend/src/auth/signup.requests.ts).
export const DEACTIVATED_ACCOUNT_MESSAGE = 'This account is deactivated. Contact an administrator.';
const LOGIN_NOTICE_KEY = 'mydeskii:login-notice';
const DEACTIVATED_NOTICE = 'deactivated';

type AuthErrorPayload = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

export function getAuthErrorMessage(payload: AuthErrorPayload | null | undefined): string {
  const value = payload?.error ?? payload?.message ?? payload?.details;
  return typeof value === 'string' ? value : '';
}

export function isTokenAuthFailure(status: number, message = ''): boolean {
  if (status === 401) return true;
  if (status !== 403) return false;

  const normalized = message.toLowerCase();
  return normalized.includes('token') && (normalized.includes('invalid') || normalized.includes('expired'));
}

export async function isAuthFailureResponse(response: Response): Promise<boolean> {
  if (response.status === 401) return true;
  if (response.status !== 403) return false;

  const payload = await response.clone().json().catch(() => null);
  return isTokenAuthFailure(response.status, getAuthErrorMessage(payload));
}

export function isDeactivatedAccountMessage(message = ''): boolean {
  return message.toLowerCase().includes('deactivated');
}

// A refresh refused for a deactivated account leaves a one-shot note so /login can say why.
export function rememberDeactivatedLogin(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LOGIN_NOTICE_KEY, DEACTIVATED_NOTICE);
}

export function takeLoginNotice(): string {
  if (typeof window === 'undefined') return '';
  const notice = sessionStorage.getItem(LOGIN_NOTICE_KEY);
  sessionStorage.removeItem(LOGIN_NOTICE_KEY);
  return notice === DEACTIVATED_NOTICE ? DEACTIVATED_ACCOUNT_MESSAGE : '';
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem(STORAGE_KEYS.USER);
  window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
}

export function hasStoredAuthSession(): boolean {
  if (typeof window === 'undefined') return false;

  const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
  const hasStoredUserSnapshot = Boolean(storedUser) && (() => {
    try {
      return Boolean(JSON.parse(storedUser as string));
    } catch {
      return false;
    }
  })();

  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_REFRESH_TOKEN);

  return hasStoredUserSnapshot;
}
