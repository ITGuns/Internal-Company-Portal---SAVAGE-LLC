const API_URL = 'http://localhost:4000/api'
const AUTH_URL = 'http://localhost:4000/auth'

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

export const devLogin = async () => {
    try {
        const res = await fetch(`${AUTH_URL}/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        const data = await res.json()
        if (data.success && data.tokens) {
            setAuthToken(data.tokens.accessToken)
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

    return response
}
