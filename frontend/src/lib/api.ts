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

export const setCurrentUser = (user: any) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
}

export const devLogin = async () => {
    try {
        const res = await fetch(`${AUTH_URL}/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'john.doe@savage.com' }) // Hardcoded for dev convenience
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

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    let token = getAuthToken()

    // If no token, specific to this dev phase, try to get one automatically
    if (!token) {
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

    // If 401 (token expired?), try to refresh or re-login
    if (response.status === 401) {
        // Simple retry strategy for dev: re-login once
        console.warn('401 Unauthorized - Attempting re-login...')
        const newToken = await devLogin()
        if (newToken) {
            return fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...headers,
                    'Authorization': `Bearer ${newToken}`
                }
            })
        }
    }

    if (!response.ok && response.status !== 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response
}
