/**
 * Authentication Types
 * Shared interfaces for auth-related data structures
 */

/**
 * Login credentials for email/password authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Auth tokens returned by backend. Browser sessions receive refresh state
 * through the httpOnly cookie; clients should not persist a refresh token.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * User data structure returned by auth endpoints
 * Matches backend User model from Prisma schema
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role?: string | null;
  roles?: string[];
  isApproved?: boolean;
  status?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  citizenship?: string | null;
  birthday?: string | null;
}

/**
 * Authentication response from login/OAuth endpoints
 * Matches backend auth.controller.ts response structure
 */
export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  tokens: AuthTokens;
  error?: string;
}

/**
 * Error response from auth endpoints
 */
export interface AuthError {
  error: string;
  message?: string;
}
