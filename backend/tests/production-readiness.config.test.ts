import assert from 'node:assert/strict'
import {
  validateCommercialRuntimeDependencies,
  validateCommercialReadinessConfig,
  type CommercialReadinessConfig,
} from '../src/config/production-readiness.config'

const baseConfig: CommercialReadinessConfig = {
  nodeEnv: 'production',
  commercialReadinessMode: true,
  authRateLimitStore: 'redis',
  emailEnabled: true,
  emailProvider: 'sendgrid',
  sendgridApiKey: 'sendgrid-key',
  smtpHost: '',
  smtpUser: '',
  smtpPass: '',
  uploadStorageDriver: 's3',
  uploadS3Bucket: 'mydeskii-uploads',
  socketRedisAdapterEnabled: true,
  vercel: false,
}

function runProductionReadinessConfigTests() {
  assert.doesNotThrow(() => validateCommercialReadinessConfig(baseConfig))

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, commercialReadinessMode: false }),
    /COMMERCIAL_READINESS_MODE must be true/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, authRateLimitStore: 'memory' }),
    /AUTH_RATE_LIMIT_STORE must be redis/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, emailEnabled: false }),
    /EMAIL_ENABLED must be true/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, sendgridApiKey: '' }),
    /SENDGRID_API_KEY is required/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, emailProvider: 'sendgird' }),
    /EMAIL_PROVIDER must be sendgrid or smtp/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, uploadStorageDriver: 'local' }),
    /UPLOAD_STORAGE_DRIVER must be s3/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, uploadS3Bucket: '' }),
    /UPLOAD_S3_BUCKET is required/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, socketRedisAdapterEnabled: false }),
    /ENABLE_SOCKET_REDIS_ADAPTER must be true/i,
  )

  assert.throws(
    () => validateCommercialReadinessConfig({ ...baseConfig, vercel: true }),
    /Vercel serverless runtime is not commercial-ready/i,
  )

  assert.doesNotThrow(() => validateCommercialRuntimeDependencies({
    refreshSessionPersistenceAvailable: true,
    uploadStorageAvailable: true,
  }))
  assert.throws(
    () => validateCommercialRuntimeDependencies({
      refreshSessionPersistenceAvailable: false,
      uploadStorageAvailable: true,
    }),
    /RefreshSession persistence is unavailable/i,
  )
  assert.throws(
    () => validateCommercialRuntimeDependencies({
      refreshSessionPersistenceAvailable: true,
      uploadStorageAvailable: false,
    }),
    /upload storage is unavailable/i,
  )
}

runProductionReadinessConfigTests()
console.log('production-readiness.config tests passed')
