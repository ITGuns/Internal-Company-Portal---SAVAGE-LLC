import * as dotenv from 'dotenv'
import * as path from 'path'
import { buildAllowedCorsOrigins } from './cors.config'
import {
    DEFAULT_AUTH_RATE_LIMIT_SETTINGS,
    resolveAuthRateLimitStoreMode,
    type AuthRateLimitSettings,
    type AuthRateLimitStoreMode,
} from '../security/rate-limit-config'
import { createLogger } from '../observability/logger'

const logger = createLogger('config.env')

// Load environment variables from .env file only if not on Vercel
if (!process.env.VERCEL) {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') })
}

interface EnvConfig {
    // Application
    nodeEnv: string
    port: number

    // Database
    databaseUrl: string

    // Redis
    redisUrl: string

    // Reverse proxy
    trustProxyHops: number

    // OAuth - Google
    googleClientId?: string
    googleClientSecret?: string
    googleCallbackUrl?: string

    // OAuth - Discord
    discordClientId?: string
    discordClientSecret?: string
    discordCallbackUrl?: string

    // JWT
    jwtSecret: string
    jwtExpiresIn: string
    refreshTokenSecret: string
    refreshTokenExpiresIn: string

    // CORS
    corsOrigin: string
    corsOrigins: string[]

    // Auth rate limiting
    authRateLimitStore: AuthRateLimitStoreMode
    authRateLimitRedisPrefix: string
    authRateLimits: AuthRateLimitSettings

    // Admin bypass emails (comma-separated in env)
    adminEmails: string[]

    // Ops manager email for approval notifications
    opsManagerEmail: string

    // Google Drive (optional)
    googleServiceAccountPath?: string
    driveBaseFolderId?: string

    // Discord Webhooks (optional)
    discordWebhookOps?: string
    discordWebhookGeneral?: string

    // Logging
    logLevel: string
}

function getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key] ?? defaultValue
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${key}`)
    }
    return value
}

function getOptionalEnvVar(key: string): string | undefined {
    return process.env[key]
}

function getPositiveIntegerEnvVar(key: string, defaultValue: number): number {
    const rawValue = getEnvVar(key, String(defaultValue))
    const parsed = Number.parseInt(rawValue, 10)

    if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`${key} must be a positive integer`)
    }

    return parsed
}

function getNonNegativeIntegerEnvVar(key: string, defaultValue: number): number {
    const rawValue = getEnvVar(key, String(defaultValue))
    const parsed = Number.parseInt(rawValue, 10)

    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${key} must be a non-negative integer`)
    }

    return parsed
}

const nodeEnv = getEnvVar('NODE_ENV', 'development')
const corsOrigin = getEnvVar('CORS_ORIGIN', 'http://localhost:3000')

export const config: EnvConfig = {
    // Application
    nodeEnv,
    port: parseInt(getEnvVar('PORT', '4000'), 10),

    // Database
    databaseUrl: getEnvVar('DATABASE_URL'),

    // Redis
    redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

    // Reverse proxy
    trustProxyHops: getNonNegativeIntegerEnvVar('TRUST_PROXY_HOPS', 0),

    // OAuth - Google
    googleClientId: getOptionalEnvVar('GOOGLE_CLIENT_ID'),
    googleClientSecret: getOptionalEnvVar('GOOGLE_CLIENT_SECRET'),
    googleCallbackUrl: getOptionalEnvVar('GOOGLE_CALLBACK_URL'),

    // OAuth - Discord
    discordClientId: getOptionalEnvVar('DISCORD_CLIENT_ID'),
    discordClientSecret: getOptionalEnvVar('DISCORD_CLIENT_SECRET'),
    discordCallbackUrl: getOptionalEnvVar('DISCORD_CALLBACK_URL'),

    // JWT
    jwtSecret: getEnvVar('JWT_SECRET'),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),
    refreshTokenSecret: getEnvVar('REFRESH_TOKEN_SECRET'),
    refreshTokenExpiresIn: getEnvVar('REFRESH_TOKEN_EXPIRES_IN', '30d'),

    // CORS
    corsOrigin,
    corsOrigins: buildAllowedCorsOrigins(corsOrigin, nodeEnv),

    // Auth rate limiting
    authRateLimitStore: resolveAuthRateLimitStoreMode(nodeEnv, getOptionalEnvVar('AUTH_RATE_LIMIT_STORE')),
    authRateLimitRedisPrefix: getEnvVar('AUTH_RATE_LIMIT_REDIS_PREFIX', 'portal:auth-rate-limit'),
    authRateLimits: {
        login: {
            limit: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_LOGIN_LIMIT', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.login.limit),
            windowMs: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_LOGIN_WINDOW_MS', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.login.windowMs),
        },
        signup: {
            limit: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_SIGNUP_LIMIT', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.signup.limit),
            windowMs: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_SIGNUP_WINDOW_MS', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.signup.windowMs),
        },
        forgotPassword: {
            limit: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_FORGOT_PASSWORD_LIMIT', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.forgotPassword.limit),
            windowMs: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.forgotPassword.windowMs),
        },
        resetPassword: {
            limit: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_RESET_PASSWORD_LIMIT', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.resetPassword.limit),
            windowMs: getPositiveIntegerEnvVar('AUTH_RATE_LIMIT_RESET_PASSWORD_WINDOW_MS', DEFAULT_AUTH_RATE_LIMIT_SETTINGS.resetPassword.windowMs),
        },
    },

    // Admin bypass emails
    adminEmails: (getOptionalEnvVar('ADMIN_EMAILS') || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean),

    // Ops manager email for approval notifications
    opsManagerEmail: getEnvVar('OPS_MANAGER_EMAIL', ''),

    // Google Drive (optional)
    googleServiceAccountPath: getOptionalEnvVar('GOOGLE_SERVICE_ACCOUNT_JSON_PATH'),
    driveBaseFolderId: getOptionalEnvVar('DRIVE_BASE_FOLDER_ID'),

    // Discord Webhooks (optional)
    discordWebhookOps: getOptionalEnvVar('DISCORD_WEBHOOK_OPS'),
    discordWebhookGeneral: getOptionalEnvVar('DISCORD_WEBHOOK_GENERAL'),

    // Logging
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
}

/**
 * Check if an email is in the admin bypass list (from ADMIN_EMAILS env var).
 */
export function isAdminEmail(email: string | undefined | null): boolean {
    if (!email) return false
    return config.adminEmails.includes(email.toLowerCase())
}

// Validate critical configuration on startup
export function validateConfig(): void {
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET']

    const missing = requiredVars.filter((key) => !process.env[key])

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Please copy .env.example to .env and fill in the required values.'
        )
    }

    logger.info('Environment configuration validated successfully')
}
