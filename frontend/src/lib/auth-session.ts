import { STORAGE_KEYS } from './constants';

export const AUTH_SESSION_CLEARED_EVENT = 'mydeskii:auth-session-cleared';
export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

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

  return Boolean(
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.LEGACY_REFRESH_TOKEN) ||
      hasStoredUserSnapshot,
  );
}
