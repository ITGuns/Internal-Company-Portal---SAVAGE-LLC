import { APP_CONFIG } from './config';
import { STORAGE_KEYS } from './constants';

const API_URL = `${APP_CONFIG.apiUrl}/api`;
const AUTH_URL = `${APP_CONFIG.apiUrl}/auth`;


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
 * Dev login function - manually login as a test user
 * @param email - Optional email, defaults to john.doe@savage.com
 * Available test users:
 * - john.doe@savage.com (Admin - Engineering)
 * - jane.smith@savage.com (Manager - Marketing)
 * - mike.johnson@savage.com (Member - Operations)
 */
export const devLogin = async (_email: string = 'john.doe@savage.com') => {
    try {
        // Use a generic admin account instead of specific person
        const res = await fetch(`${AUTH_URL}/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@savage.com' })
        })
        const data = await res.json()
        if (data.success && data.tokens) {
            setAuthToken(data.tokens.accessToken)
            setCurrentUser(data.user);
            return data.tokens.accessToken
        }
    } catch (err) {
        console.error('Dev login failed', err)
    }
    return null
}

interface APIOptions extends RequestInit {
    _isRetry?: boolean;
}

export const apiFetch = async (endpoint: string, options: APIOptions = {}): Promise<Response> => {
    let token = getAuthToken()
    if (!token && process.env.NODE_ENV !== 'production') {
        token = await devLogin()
    }

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

    // If 403, and in dev, maybe the role was added recently. Try re-logging in.
    if (response.status === 403 && process.env.NODE_ENV !== 'production' && !options._isRetry) {
        console.warn('403 Forbidden - Attempting dev re-login');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
        }
        return apiFetch(endpoint, { ...options, _isRetry: true });
    }

    // If 401, return response to let caller handle it (usually triggers logout in UserContext)
    if (response.status === 401) {
        console.warn('401 Unauthorized');
        // Do NOT auto-login. Let UserContext or the component handle the auth failure.
    }

    if (!response.ok && response.status !== 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
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
        let body;
        const headers: Record<string, string> = {};

        if (typeof file === 'string') {
            // Base64 string
            body = JSON.stringify({ avatar: file });
            headers['Content-Type'] = 'application/json';
        } else {
            // File upload
            const formData = new FormData();
            formData.append('avatar', file);
            body = formData;
            // Don't set Content-Type for FormData, browser will set it with boundary
        }

        const token = getAuthToken();
        const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...headers,
            },
            body,
        });

        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }

        const data = await response.json();

        // Update localStorage with new avatar
        if (data.user) {
            setCurrentUser(data.user);
        }

        return data;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
};
