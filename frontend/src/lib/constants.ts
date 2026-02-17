/**
 * Application Constants
 * Centralized magic numbers, strings, and configuration values
 */

// ============================================
// TASK CONSTANTS
// ============================================
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;

export type TaskPriority = typeof TASK_PRIORITIES[number];
export type TaskStatus = typeof TASK_STATUSES[number];

// ============================================
// ANNOUNCEMENT CONSTANTS
// ============================================
export const ANNOUNCEMENT_CATEGORIES = [
  'News',
  'Shoutout',
  'Event',
  'Birthday'
] as const;

export type AnnouncementCategory = typeof ANNOUNCEMENT_CATEGORIES[number];

// ============================================
// DAILY LOG CONSTANTS
// ============================================
export const LOG_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;
export type LogStatus = typeof LOG_STATUSES[number];

// ============================================
// DEPARTMENT CONSTANTS
// ============================================
export const DEPARTMENTS = [
  'Owners / Founders',
  'Design',
  'Development',
  'Marketing',
  'Operations',
  'Sales'
] as const;

export type Department = typeof DEPARTMENTS[number];

// ============================================
// UI MESSAGES
// ============================================
export const MESSAGES = {
  // Success
  SUCCESS_CREATE: 'Created successfully',
  SUCCESS_UPDATE: 'Updated successfully',
  SUCCESS_DELETE: 'Deleted successfully',
  
  // Errors
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  ERROR_NETWORK: 'Network error. Please check your connection.',
  ERROR_UNAUTHORIZED: 'You are not authorized to perform this action.',
  ERROR_NOT_FOUND: 'The requested resource was not found.',
  
  // Validation
  VALIDATION_REQUIRED: 'This field is required',
  VALIDATION_EMAIL: 'Please enter a valid email address',
  VALIDATION_MIN_LENGTH: 'Minimum length not met',
  VALIDATION_MAX_LENGTH: 'Maximum length exceeded',
  
  // Loading
  LOADING_DEFAULT: 'Loading...',
  LOADING_SAVING: 'Saving...',
  LOADING_DELETING: 'Deleting...',
} as const;

// ============================================
// LOCAL STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  USER: 'currentUser',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
} as const;

// ============================================
// POLLING INTERVALS (deprecated - use APP_CONFIG)
// ============================================
export const POLL_INTERVALS = {
  USER: 30000, // 30 seconds
  NOTIFICATIONS: 60000, // 60 seconds
} as const;

// ============================================
// DATE FORMATS
// ============================================
export const DATE_FORMATS = {
  DISPLAY: 'PPP', // Jan 1, 2026
  DISPLAY_WITH_TIME: 'PPP p', // Jan 1, 2026 3:45 PM
  ISO: 'yyyy-MM-dd',
  TIME_ONLY: 'p', // 3:45 PM
} as const;

// ============================================
// VALIDATION LIMITS
// ============================================
export const LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_MESSAGE_LENGTH: 2000,
  MAX_ANNOUNCEMENT_BODY: 5000,
  MAX_TITLE_LENGTH: 200,
  MIN_PASSWORD_LENGTH: 8,
} as const;

// ============================================
// COLOR TOKENS (CSS variable names)
// ============================================
export const COLOR_TOKENS = {
  // Priority Colors
  PRIORITY_LOW: 'var(--priority-low)',
  PRIORITY_MEDIUM: 'var(--priority-medium)',
  PRIORITY_HIGH: 'var(--priority-high)',
  
  // Status Colors
  STATUS_PENDING: 'var(--status-pending)',
  STATUS_IN_PROGRESS: 'var(--status-in-progress)',
  STATUS_COMPLETED: 'var(--status-completed)',
  
  // Category Colors
  CATEGORY_NEWS: 'var(--category-news)',
  CATEGORY_SHOUTOUT: 'var(--category-shoutout)',
  CATEGORY_EVENT: 'var(--category-event)',
  CATEGORY_BIRTHDAY: 'var(--category-birthday)',
} as const;

// ============================================
// SOCKET EVENTS
// ============================================
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  NOTIFICATION: 'notification',
  USER_UPDATE: 'userUpdate',
} as const;
