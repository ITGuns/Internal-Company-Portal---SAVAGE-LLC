import { Request, Response } from 'express'
import crypto from 'node:crypto'
import { ipKeyGenerator, rateLimit, type RateLimitRequestHandler, type Store } from 'express-rate-limit'
import {
    DEFAULT_AUTH_RATE_LIMIT_SETTINGS,
    resolveAuthRateLimitStoreMode,
    type AuthRateLimitRoute,
    type AuthRateLimitSettings,
    type AuthRateLimitStoreMode,
    type RateLimitRule,
} from './rate-limit-config'

export {
    DEFAULT_AUTH_RATE_LIMIT_SETTINGS,
    resolveAuthRateLimitStoreMode,
    type AuthRateLimitRoute,
    type AuthRateLimitSettings,
    type AuthRateLimitStoreMode,
    type RateLimitRule,
}

export interface AuthRateLimitStoreFactory {
    mode: AuthRateLimitStoreMode
    createStore: (route: AuthRateLimitRoute) => Store
    shutdown?: () => Promise<void>
}

export interface AuthRateLimiters {
    login: RateLimitRequestHandler
    signup: RateLimitRequestHandler
    forgotPassword: RateLimitRequestHandler
    resetPassword: RateLimitRequestHandler
}

interface CreateAuthRateLimitersOptions {
    settings?: AuthRateLimitSettings
    storeFactory?: AuthRateLimitStoreFactory
}

const AUTH_RATE_LIMIT_MESSAGES: Record<AuthRateLimitRoute, string> = {
    login: 'Too many login attempts. Please try again later.',
    signup: 'Too many signup attempts. Please try again later.',
    forgotPassword: 'Too many password reset requests. Please try again later.',
    resetPassword: 'Too many password reset attempts. Please try again later.',
}

export function hashLoginRateLimitAccount(email: unknown): string {
    const normalizedEmail = typeof email === 'string'
        ? email.trim().toLowerCase()
        : '<missing-email>'
    return crypto.createHash('sha256').update(normalizedEmail).digest('hex')
}

function createLimiter(
    route: AuthRateLimitRoute,
    rule: RateLimitRule,
    storeFactory?: AuthRateLimitStoreFactory,
): RateLimitRequestHandler {
    return rateLimit({
        windowMs: rule.windowMs,
        limit: rule.limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        store: storeFactory?.createStore(route),
        passOnStoreError: false,
        keyGenerator: route === 'login'
            ? (req) => `${ipKeyGenerator(req.ip || 'unknown')}:${hashLoginRateLimitAccount(req.body?.email)}`
            : undefined,
        handler: (_req: Request, res: Response) => {
            res.status(429).json({ error: AUTH_RATE_LIMIT_MESSAGES[route] })
        },
    })
}

export function createAuthRateLimiters(
    options: CreateAuthRateLimitersOptions = {},
): AuthRateLimiters {
    const settings = options.settings || DEFAULT_AUTH_RATE_LIMIT_SETTINGS

    return {
        login: createLimiter('login', settings.login, options.storeFactory),
        signup: createLimiter('signup', settings.signup, options.storeFactory),
        forgotPassword: createLimiter('forgotPassword', settings.forgotPassword, options.storeFactory),
        resetPassword: createLimiter('resetPassword', settings.resetPassword, options.storeFactory),
    }
}
