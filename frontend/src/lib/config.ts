/**
 * Centralized Application Configuration
 * All environment-dependent values are defined here
 */

export const APP_CONFIG = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  
  // App Metadata
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'SAVAGE LLC Internal Portal',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.5.0',
  
  // Feature Flags
  enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  
  // Polling Intervals (milliseconds)
  userPollInterval: 30000, // 30 seconds
  notificationPollInterval: 60000, // 60 seconds
  
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
