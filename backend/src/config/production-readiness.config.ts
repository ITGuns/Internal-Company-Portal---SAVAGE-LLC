import type { AuthRateLimitStoreMode } from '../security/rate-limit-config'

export interface CommercialReadinessConfig {
    nodeEnv: string
    commercialReadinessMode: boolean
    authRateLimitStore: AuthRateLimitStoreMode
    emailEnabled: boolean
    emailProvider: string
    sendgridApiKey?: string
    smtpHost?: string
    smtpUser?: string
    smtpPass?: string
    uploadStorageDriver: 'local' | 's3'
    uploadS3Bucket?: string
    socketRedisAdapterEnabled: boolean
    vercel: boolean
}

export interface CommercialRuntimeDependencies {
    refreshSessionPersistenceAvailable: boolean
    uploadStorageAvailable: boolean
}

export function parseBooleanEnv(value: string | undefined, defaultValue = false): boolean {
    if (value === undefined || value.trim() === '') return defaultValue

    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false

    throw new Error(`Invalid boolean environment value: ${value}`)
}

export function validateCommercialReadinessConfig(config: CommercialReadinessConfig): void {
    if (config.nodeEnv !== 'production') {
        throw new Error('Commercial readiness checks only apply when NODE_ENV=production')
    }

    if (!config.commercialReadinessMode) {
        throw new Error('COMMERCIAL_READINESS_MODE must be true for commercial launch validation')
    }

    if (config.vercel) {
        throw new Error('Vercel serverless runtime is not commercial-ready for durable realtime and uploads')
    }

    if (config.authRateLimitStore !== 'redis') {
        throw new Error('AUTH_RATE_LIMIT_STORE must be redis for commercial launch')
    }

    if (!config.emailEnabled) {
        throw new Error('EMAIL_ENABLED must be true for commercial launch')
    }

    if (config.emailProvider !== 'sendgrid' && config.emailProvider !== 'smtp') {
        throw new Error('EMAIL_PROVIDER must be sendgrid or smtp for commercial launch')
    }

    if (config.emailProvider === 'sendgrid' && !config.sendgridApiKey) {
        throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid')
    }

    if (config.emailProvider === 'smtp' && (!config.smtpHost || !config.smtpUser || !config.smtpPass)) {
        throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required when EMAIL_PROVIDER=smtp')
    }

    if (config.uploadStorageDriver !== 's3') {
        throw new Error('UPLOAD_STORAGE_DRIVER must be s3 for commercial launch')
    }

    if (!config.uploadS3Bucket) {
        throw new Error('UPLOAD_S3_BUCKET is required when UPLOAD_STORAGE_DRIVER=s3')
    }

    if (!config.socketRedisAdapterEnabled) {
        throw new Error('ENABLE_SOCKET_REDIS_ADAPTER must be true for commercial launch')
    }
}

export function validateCommercialRuntimeDependencies(dependencies: CommercialRuntimeDependencies): void {
    if (!dependencies.refreshSessionPersistenceAvailable) {
        throw new Error('RefreshSession persistence is unavailable; apply Prisma migrations before commercial startup')
    }

    if (!dependencies.uploadStorageAvailable) {
        throw new Error('Commercial upload storage is unavailable; verify bucket access and credentials')
    }
}
