import { APP_CONFIG } from './config';
import { STORAGE_KEYS } from './constants';
import type { LoginCredentials, AuthResponse } from './types/auth';

const API_URL = '/api';
const AUTH_URL = '/backend-auth';


export const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('accessToken')
    }
    return null
}

export const setAuthToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token)
    }
}

export const getRefreshToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('refreshToken')
    }
    return null
}

export const setRefreshToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', token)
    }
}

export const getCurrentUser = () => {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem(STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    }
    return null;
}

export const setCurrentUser = (user: Record<string, unknown>) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token on success, null on failure.
 */
const tryRefreshToken = async (): Promise<string | null> => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null
    try {
        const res = await fetch(`${AUTH_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        })
        if (res.ok) {
            const data = await res.json()
            if (data.accessToken) {
                setAuthToken(data.accessToken)
                return data.accessToken
            }
        }
    } catch (err) {
        console.error('Token refresh failed:', err)
    }
    return null
}

/**
 * Login with email and password
 * @param credentials - Email and password
 * @returns Auth response with user data and tokens
 * @throws Error if login fails
 * 
 * NOTE: Email/password authentication not yet implemented in backend.
 * This is a placeholder for future implementation.
 */
export const loginWithEmail = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        const data = await res.json();

        if (res.ok && data.success && data.tokens) {
            // Store auth token and user data
            setAuthToken(data.tokens.accessToken);
            setCurrentUser(data.user);
            return data;
        }

        // Return error response
        throw new Error(data.error || 'Login failed');
    } catch (err) {
        console.error('Email login error:', err);
        throw err instanceof Error ? err : new Error('Login failed. Please try again.');
    }
}

/**
 * Logout user
 * Clears auth tokens and user data from localStorage
 */
export const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem(STORAGE_KEYS.USER);
    }
}

/**
 * Request a password reset email
 */
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${AUTH_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
    }
    return data;
}

/**
 * Reset password using token from email
 */
export const resetPassword = async (token: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${AUTH_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
    }
    return data;
}

interface APIOptions extends RequestInit {
    _isRetry?: boolean;
}

export const apiFetch = async (endpoint: string, options: APIOptions = {}): Promise<Response> => {
    const token = getAuthToken()

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        cache: 'no-store',
        headers,
    })

    // If 401, try refreshing the token once before giving up
    if (response.status === 401 && !options._isRetry) {
        // Try refresh token first
        const newToken = await tryRefreshToken()
        if (newToken) {
            return apiFetch(endpoint, { ...options, _isRetry: true })
        }

        // Nothing worked — clear tokens silently.
        // DO NOT redirect here: window.location.href cancels all in-flight fetches
        // with TypeError("Failed to fetch"), flooding the UI with error toasts.
        // UserContext will detect the 401 on its next /auth/me poll and handle logout.
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem(STORAGE_KEYS.USER)
        }
    }

    if (!response.ok && response.status !== 401) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.details || errorData.error || `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return response
}

// ============================================
// USER PROFILE API
// ============================================

/**
 * Update user profile
 * @param userId - User ID
 * @param profileData - Profile data to update (name, email, phone, birthday, etc.)
 * @returns Updated user object
 */
export const updateUserProfile = async (userId: string | number, profileData: Partial<{
    name: string;
    email: string;
    phone?: string;
    birthday?: string;
    address?: string;
    city?: string;
    citizenship?: string;
    bio?: string;
    position?: string;
    department?: string;
}>) => {
    try {
        const response = await apiFetch(`/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(profileData),
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        const data = await response.json();

        // Update localStorage with new user data
        if (data.user) {
            setCurrentUser(data.user);
        }

        return data;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

/**
 * Upload user avatar
 * @param userId - User ID
 * @param file - Image file or base64 string
 * @returns Updated user object with new avatar URL
 */
export const uploadAvatar = async (userId: string | number, file: File | string) => {
    try {
        let avatarData: string;

        if (typeof file === 'string') {
            // Already a base64 data URI or URL
            avatarData = file;
        } else {
            // Convert File to base64 data URI
            avatarData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        const token = getAuthToken();
        const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ avatar: avatarData }),
        });

        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }

        const data = await response.json();

        // Update localStorage with new user data
        if (data.user) {
            setCurrentUser(data.user);
        }

        return data;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
};
// ============================================
// ROLES API
// ============================================

/**
 * Get all available roles
 * @param departmentId - Optional department ID to filter by
 * @returns Array of roles
 */
export const fetchRoles = async (departmentId?: string) => {
    const endpoint = departmentId ? `/roles?departmentId=${departmentId}` : '/roles';
    const response = await apiFetch(endpoint);
    return response.json();
};

/**
 * Create a new available role
 * @param roleData - Role name and optional departmentId
 * @returns Created role
 */
export const createRole = async (roleData: { name: string; departmentId?: string }) => {
    const response = await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify(roleData),
    });
    return response.json();
};

/**
 * Delete an available role
 * @param roleId - Role ID to delete
 */
export const deleteRole = async (roleId: string) => {
    await apiFetch(`/roles/${roleId}`, {
        method: 'DELETE',
    });
};
