import * as dotenv from 'dotenv'
import * as path from 'path'

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

export const config: EnvConfig = {
    // Application
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    port: parseInt(getEnvVar('PORT', '4000'), 10),

    // Database
    databaseUrl: getEnvVar('DATABASE_URL'),

    // Redis
    redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

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
    corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),

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

    console.log('✅ Environment configuration validated successfully')
}
