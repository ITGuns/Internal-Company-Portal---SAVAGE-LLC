import { APP_CONFIG } from './config';

const DEFAULT_API_BASE_URL = '/api';
const API_PATH_SUFFIX = '/api';
const AUTH_PATH_SUFFIX = '/backend-auth';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function ensureLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

function normalizeEndpoint(endpoint: string): string {
  return ensureLeadingSlash(endpoint.trim());
}

export function normalizeApiBaseUrl(baseUrl = APP_CONFIG.apiUrl): string {
  const trimmed = trimTrailingSlashes((baseUrl || DEFAULT_API_BASE_URL).trim());
  if (!trimmed) return DEFAULT_API_BASE_URL;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (typeof window !== 'undefined') {
      const configuredOrigin = new URL(trimmed).origin;
      if (configuredOrigin !== window.location.origin) {
        // Browser requests should use the app origin so Next/Vercel rewrites can own CORS.
        return DEFAULT_API_BASE_URL;
      }
    }

    return trimmed.endsWith(API_PATH_SUFFIX) ? trimmed : `${trimmed}${API_PATH_SUFFIX}`;
  }

  const relativeBase = ensureLeadingSlash(trimmed);
  return relativeBase.endsWith(API_PATH_SUFFIX) ? relativeBase : `${relativeBase}${API_PATH_SUFFIX}`;
}

export function buildApiUrl(endpoint: string): string {
  return `${normalizeApiBaseUrl()}${normalizeEndpoint(endpoint)}`;
}

export function buildAuthUrl(endpoint: string): string {
  const apiBaseUrl = normalizeApiBaseUrl();
  const authBaseUrl = apiBaseUrl.endsWith(API_PATH_SUFFIX)
    ? apiBaseUrl.slice(0, -API_PATH_SUFFIX.length) || ''
    : apiBaseUrl;

  return `${authBaseUrl}${AUTH_PATH_SUFFIX}${normalizeEndpoint(endpoint)}`;
}
