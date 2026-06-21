export type AuthRateLimitRoute = 'login' | 'signup' | 'forgotPassword' | 'resetPassword'
export type AuthRateLimitStoreMode = 'memory' | 'redis'

export interface RateLimitRule {
    limit: number
    windowMs: number
}

export interface AuthRateLimitSettings {
    login: RateLimitRule
    signup: RateLimitRule
    forgotPassword: RateLimitRule
    resetPassword: RateLimitRule
}

export const DEFAULT_AUTH_RATE_LIMIT_SETTINGS: AuthRateLimitSettings = {
    login: { limit: 10, windowMs: 15 * 60 * 1000 },
    signup: { limit: 5, windowMs: 60 * 60 * 1000 },
    forgotPassword: { limit: 5, windowMs: 60 * 60 * 1000 },
    resetPassword: { limit: 5, windowMs: 60 * 60 * 1000 },
}

export function resolveAuthRateLimitStoreMode(
    nodeEnv: string,
    requestedMode?: string,
): AuthRateLimitStoreMode {
    const normalized = requestedMode?.trim().toLowerCase()

    if (!normalized) {
        return nodeEnv === 'production' ? 'redis' : 'memory'
    }

    if (normalized === 'redis' || normalized === 'memory') {
        return normalized
    }

    throw new Error('AUTH_RATE_LIMIT_STORE must be either "redis" or "memory"')
}
