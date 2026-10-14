/**
 * Centralized Application Configuration
 * All environment-dependent values are defined here
 */

export const APP_CONFIG = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  
  // App Metadata
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Deskii',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.5.0',
  
  // Feature Flags
  enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  // Realtime needs a socket host that can hold a connection. In production
  // that means NEXT_PUBLIC_WS_URL must be set; the flag alone cannot turn it
  // on, because the Vercel functions behind /api cannot serve Socket.io.
  enableRealtime:
    process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'false'
    && (process.env.NODE_ENV !== 'production' || Boolean(process.env.NEXT_PUBLIC_WS_URL)),
  
  // Polling Intervals (milliseconds)
  userPollInterval: 30000, // 30 seconds
  // Fallback polls, used only while enableRealtime is false (lib/realtime-fallback.ts).
  notificationPollInterval: 30000, // 30 seconds
  chatMessagePollInterval: 10000, // 10 seconds, open conversation
  chatConversationPollInterval: 30000, // 30 seconds, conversation list and unread counts
  listPollInterval: 60000, // 60 seconds, tasks, announcements and daily logs

  // UI Configuration
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxMessageLength: 2000,
  maxAnnouncementBodyLength: 5000,
  
  // Toast Configuration
  toastDuration: 3000, // 3 seconds
  toastPosition: 'top-right' as const,
} as const;

// Type-safe config access
export type AppConfig = typeof APP_CONFIG;

// Validation helper
export function validateConfig(): boolean {
  if (!APP_CONFIG.apiUrl) {
    console.error('Missing NEXT_PUBLIC_API_URL environment variable');
    return false;
  }
  if (!APP_CONFIG.wsUrl) {
    console.error('Missing NEXT_PUBLIC_WS_URL environment variable');
    return false;
  }
  return true;
}
