import assert from 'node:assert/strict'
import {
  MemoryUploadStorage,
  resolveUploadStorageConfig,
} from '../src/uploads/upload.storage'

async function runUploadStorageTests() {
  assert.deepEqual(
    resolveUploadStorageConfig({
      UPLOAD_STORAGE_DRIVER: undefined,
      VERCEL: undefined,
    }),
    { driver: 'local' },
  )

  assert.deepEqual(
    resolveUploadStorageConfig({
      UPLOAD_STORAGE_DRIVER: 's3',
      UPLOAD_S3_BUCKET: 'mydeskii-uploads',
      UPLOAD_S3_REGION: 'ap-southeast-1',
      UPLOAD_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
      UPLOAD_S3_FORCE_PATH_STYLE: 'true',
    }),
    {
      driver: 's3',
      bucket: 'mydeskii-uploads',
      region: 'ap-southeast-1',
      endpoint: 'https://example.r2.cloudflarestorage.com',
      forcePathStyle: true,
    },
  )

  assert.throws(
    () => resolveUploadStorageConfig({ UPLOAD_STORAGE_DRIVER: 's3' }),
    /UPLOAD_S3_BUCKET is required/i,
  )

  const storage = new MemoryUploadStorage()
  assert.equal(await storage.healthCheck(), true)
  const body = Buffer.from('stored content', 'utf8')
  await storage.save({
    filename: '1700000000000-report.txt',
    contentType: 'text/plain',
    buffer: body,
  })

  const stored = await storage.read('1700000000000-report.txt')
  assert.equal(stored?.contentType, 'text/plain')
  assert.deepEqual(stored?.buffer, body)
  assert.equal(await storage.read('missing.txt'), null)

  await storage.delete('1700000000000-report.txt')
  assert.equal(await storage.read('1700000000000-report.txt'), null)
}

runUploadStorageTests()
  .then(() => {
    console.log('upload.storage tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
