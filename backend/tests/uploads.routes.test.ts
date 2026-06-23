import assert from 'node:assert/strict'
import express from 'express'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { AddressInfo } from 'net'
import { prisma } from '../src/database/prisma.service'

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test?schema=public'
process.env.JWT_SECRET ||= 'test-upload-route-jwt-secret'
process.env.REFRESH_TOKEN_SECRET ||= 'test-upload-route-refresh-secret'

const { JwtService } = require('../src/auth/jwt.service') as typeof import('../src/auth/jwt.service')
const { UploadsController } = require('../src/uploads/uploads.controller') as typeof import('../src/uploads/uploads.controller')

const uploadDir = path.join(__dirname, '../uploads')
const pdf = Buffer.from('%PDF-1.7\nroute upload test\n', 'ascii')
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const text = Buffer.from('<script>alert("served as text")</script>\n', 'utf8')

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function cleanupUploadedFile(filename: unknown): void {
  if (typeof filename !== 'string' || filename.includes('/') || filename.includes('\\')) return
  fs.rmSync(path.join(uploadDir, filename), { force: true })
}

async function runUploadRouteTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const owner = await prisma.user.create({
    data: {
      email: `upload-owner-${suffix}@example.com`,
      name: 'Upload Owner',
      status: 'active',
      isApproved: true,
    },
  })
  const unrelatedUser = await prisma.user.create({
    data: {
      email: `upload-unrelated-${suffix}@example.com`,
      name: 'Upload Unrelated',
      status: 'active',
      isApproved: true,
    },
  })
  const app = express()
  app.use(express.json({ limit: '20mb' }))
  app.use('/api/uploads', new UploadsController().router())

  const server = app.listen(0)
  const address = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${address.port}/api/uploads`
  const token = JwtService.generateAccessToken({
    userId: owner.id,
    email: owner.email,
    name: 'Upload Route Test',
  })
  const unrelatedToken = JwtService.generateAccessToken({
    userId: unrelatedUser.id,
    email: unrelatedUser.email,
    name: 'Upload Unrelated',
  })

  const uploadedFilenames: string[] = []
  let clientOrganizationId = ''

  try {
    const unauthorized = await fetch(`${baseUrl}/files/1700000000000-file.pdf`)
    assert.equal(unauthorized.status, 401)

    const pdfUpload = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        name: 'Quarterly Report.exe',
        type: 'application/pdf',
        data: pdf.toString('base64'),
      }),
    })
    assert.equal(pdfUpload.status, 201)
    const pdfBody = await pdfUpload.json() as { id: string; filename: string; name: string; type: string; url: string; size: number }
    uploadedFilenames.push(pdfBody.filename)

    assert.match(pdfBody.filename, /^[0-9a-f-]{36}\.pdf$/)
    assert.equal(pdfBody.name, 'quarterly_report.pdf')
    assert.equal(pdfBody.type, 'application/pdf')
    assert.equal(pdfBody.size, pdf.length)
    assert.equal(pdfBody.url, `/api/uploads/files/${pdfBody.id}`)

    const pdfFetch = await fetch(`${baseUrl}/files/${pdfBody.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(pdfFetch.status, 200)
    assert.match(pdfFetch.headers.get('content-type') || '', /^application\/pdf\b/)
    assert.equal(pdfFetch.headers.get('x-content-type-options'), 'nosniff')
    assert.deepEqual(Buffer.from(await pdfFetch.arrayBuffer()), pdf)

    const unrelatedFetch = await fetch(`${baseUrl}${pdfBody.url.replace('/api/uploads', '')}`, {
      headers: { Authorization: `Bearer ${unrelatedToken}` },
    })
    assert.equal(unrelatedFetch.status, 404)

    const organization = await prisma.clientOrganization.create({
      data: {
        name: `Upload Client ${suffix}`,
        slug: `upload-client-${suffix}`,
        memberships: {
          create: {
            userId: unrelatedUser.id,
            status: 'active',
            role: 'client',
          },
        },
      },
    })
    clientOrganizationId = organization.id
    const asset = await prisma.clientAsset.create({
      data: {
        organizationId: organization.id,
        label: 'Client-visible upload',
        url: pdfBody.url,
        type: 'file',
        visibleToClient: true,
        uploadId: pdfBody.id,
      },
    })

    const clientVisibleFetch = await fetch(`${baseUrl}${pdfBody.url.replace('/api/uploads', '')}`, {
      headers: { Authorization: `Bearer ${unrelatedToken}` },
    })
    assert.equal(clientVisibleFetch.status, 200)

    await prisma.clientAsset.update({
      where: { id: asset.id },
      data: { visibleToClient: false },
    })
    const hiddenClientFetch = await fetch(`${baseUrl}${pdfBody.url.replace('/api/uploads', '')}`, {
      headers: { Authorization: `Bearer ${unrelatedToken}` },
    })
    assert.equal(hiddenClientFetch.status, 404)

    const textUpload = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        name: 'unsafe.html',
        type: 'text/plain',
        data: text.toString('base64'),
      }),
    })
    assert.equal(textUpload.status, 201)
    const textBody = await textUpload.json() as { id: string; filename: string; name: string; type: string }
    uploadedFilenames.push(textBody.filename)

    assert.match(textBody.filename, /^[0-9a-f-]{36}\.txt$/)
    assert.equal(textBody.name, 'unsafe.txt')
    assert.equal(textBody.type, 'text/plain')

    const textFetch = await fetch(`${baseUrl}/files/${textBody.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(textFetch.status, 200)
    assert.match(textFetch.headers.get('content-type') || '', /^text\/plain\b/)
    assert.equal(textFetch.headers.get('x-content-type-options'), 'nosniff')

    const mismatchedUpload = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        name: 'image.pdf',
        type: 'application/pdf',
        data: png.toString('base64'),
      }),
    })
    assert.equal(mismatchedUpload.status, 400)
    assert.match((await mismatchedUpload.json() as { error: string }).error, /content/i)

    const invalidExtensionFetch = await fetch(`${baseUrl}/files/1700000000000-report.exe`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(invalidExtensionFetch.status, 404)

    const traversalFetch = await fetch(`${baseUrl}/files/..%5C${pdfBody.filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(traversalFetch.status, 404)

    console.log('uploads.routes tests passed')
  } finally {
    for (const filename of uploadedFilenames) cleanupUploadedFile(filename)
    await closeServer(server)
    if (clientOrganizationId) {
      await prisma.clientOrganization.delete({ where: { id: clientOrganizationId } })
    }
    await prisma.storedUpload.deleteMany({ where: { ownerId: { in: [owner.id, unrelatedUser.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, unrelatedUser.id] } } })
  }
}

runUploadRouteTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
