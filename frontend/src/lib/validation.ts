/**
 * Validation Utility Functions
 * 
 * Centralized validation helpers to eliminate repeated
 * validation logic across forms and components.
 */

/**
 * Check if a string is empty or only whitespace
 * Replaces: !value.trim()
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Check if a string is not empty
 * Replaces: value.trim().length > 0
 */
export function isNotEmpty(value: string | null | undefined): boolean {
  return !isEmpty(value);
}

/**
 * Validate email format
 * @param email - Email string to validate
 */
export function isValidEmail(email: string): boolean {
  if (isEmpty(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate phone number format
 * Allows digits, spaces, hyphens, plus, and parentheses
 * @param phone - Phone number to validate
 */
export function isValidPhone(phone: string): boolean {
  if (isEmpty(phone)) return true; // Optional field
  return /^[\d\s\-\+\(\)]+$/.test(phone.trim());
}

/**
 * Validate URL format
 * @param url - URL string to validate
 */
export function isValidUrl(url: string): boolean {
  if (isEmpty(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate minimum length
 * @param value - String to validate
 * @param minLength - Minimum required length
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

/**
 * Validate maximum length
 * @param value - String to validate
 * @param maxLength - Maximum allowed length
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.trim().length <= maxLength;
}

/**
 * Validate number is within range
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate that a date is not in the future
 * @param date - Date to validate
 */
export function isNotFutureDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d <= new Date();
}

/**
 * Validate that a date is not in the past
 * @param date - Date to validate
 */
export function isNotPastDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d >= new Date();
}

/**
 * Validate required field
 * Returns error message if invalid, null if valid
 * @param value - Value to validate
 * @param fieldName - Name of the field for error message
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string = 'This field'
): string | null {
  return isEmpty(value) ? `${fieldName} is required` : null;
}

/**
 * Validate email field
 * Returns error message if invalid, null if valid
 * @param email - Email to validate
 * @param required - Whether the field is required
 */
export function validateEmail(email: string, required: boolean = true): string | null {
  if (isEmpty(email)) {
    return required ? 'Email is required' : null;
  }
  return isValidEmail(email) ? null : 'Invalid email format';
}

/**
 * Validate phone field
 * Returns error message if invalid, null if valid
 * @param phone - Phone number to validate
 * @param required - Whether the field is required
 */
export function validatePhone(phone: string, required: boolean = false): string | null {
  if (isEmpty(phone)) {
    return required ? 'Phone number is required' : null;
  }
  return isValidPhone(phone) ? null : 'Invalid phone number format';
}

/**
 * Validate length constraints
 * Returns error message if invalid, null if valid
 * @param value - String to validate
 * @param fieldName - Name of the field for error message
 * @param min - Minimum length
 * @param max - Maximum length
 */
export function validateLength(
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): string | null {
  const length = value.trim().length;

  if (min !== undefined && length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }

  if (max !== undefined && length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }

  return null;
}

/**
 * Validate file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes
 */
export function isValidFileSize(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/jpeg', 'image/png'])
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate image file
 * Returns error message if invalid, null if valid
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes (default: 5MB)
 */
export function validateImageFile(file: File | null, maxSizeMB: number = 5): string | null {
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    return 'Please select an image file';
  }

  if (!isValidFileSize(file, maxSizeMB)) {
    return `Image size must be less than ${maxSizeMB}MB`;
  }

  return null;
}

/**
 * Trim all string values in an object
 * Useful for cleaning form data before submission
 * @param obj - Object with string values to trim
 */
export function trimObject<T extends Record<string, unknown>>(obj: T): T {
  const trimmed: Record<string, unknown> = {};
  for (const key in obj) {
    const value = obj[key];
    trimmed[key] = typeof value === 'string' ? value.trim() : value;
  }
  return trimmed as T;
}

/**
 * Remove empty string values from an object
 * Converts empty strings to undefined
 * @param obj - Object to clean
 */
export function removeEmptyStrings<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string' && isEmpty(value)) {
      cleaned[key] = undefined;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}
