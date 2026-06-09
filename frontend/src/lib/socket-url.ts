import { APP_CONFIG } from './config';

function normalizeSocketBaseUrl(baseUrl = APP_CONFIG.wsUrl): string {
  return baseUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://');
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname === '[::1]';
}

export function resolveSocketUrl(
  configuredSocketUrl = APP_CONFIG.wsUrl,
  currentOrigin?: string,
): string {
  const socketUrl = normalizeSocketBaseUrl(configuredSocketUrl);
  if (typeof window === 'undefined' && !currentOrigin) return socketUrl;

  const origin = currentOrigin || window.location.origin;
  const currentHostname = new URL(origin).hostname;
  const configuredUrl = new URL(socketUrl, origin);

  if (configuredUrl.origin === origin) return configuredUrl.origin;

  if (isLoopbackHost(currentHostname) && isLoopbackHost(configuredUrl.hostname)) {
    return socketUrl;
  }

  return origin;
}
