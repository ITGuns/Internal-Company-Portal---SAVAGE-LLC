import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { config } from '../src/config/env.config'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import {
  canUpdateWorkspaceBranding,
  getPublicWorkspaceConfig,
  WorkspaceController,
} from '../src/workspace/workspace.controller'

const originalWorkspaceConfig = {
  workspaceName: config.workspaceName,
  workspaceLogoUrl: config.workspaceLogoUrl,
  workspaceLogoAlt: config.workspaceLogoAlt,
  workspaceTagline: config.workspaceTagline,
  adminEmails: [...config.adminEmails],
}

try {
  config.workspaceName = 'Acme Operations'
  config.workspaceLogoUrl = 'https://cdn.example.com/brand/logo.svg'
  config.workspaceLogoAlt = 'Acme logo'
  config.workspaceTagline = 'Client delivery hub'

  assert.deepEqual(getPublicWorkspaceConfig(), {
    name: 'Acme Operations',
    logoUrl: 'https://cdn.example.com/brand/logo.svg',
    logoAlt: 'Acme logo',
    tagline: 'Client delivery hub',
    signInMessage: 'Sign in to your Acme Operations workspace',
  })

  config.workspaceLogoUrl = '/brand/logo.svg'
  assert.equal(getPublicWorkspaceConfig().logoUrl, '/brand/logo.svg')

  config.workspaceLogoUrl = 'javascript:alert(1)'
  assert.equal(getPublicWorkspaceConfig().logoUrl, null)

  config.workspaceLogoUrl = '//cdn.example.com/logo.svg'
  assert.equal(getPublicWorkspaceConfig().logoUrl, null)

  config.workspaceLogoUrl = 'https://cdn.example.com/logo with spaces.svg'
  assert.equal(getPublicWorkspaceConfig().logoUrl, null)

  assert.equal(
    canUpdateWorkspaceBranding({ roles: [{ role: 'Operations Manager' }] }),
    true,
  )
  assert.equal(
    canUpdateWorkspaceBranding({ roles: [{ role: 'Owner / Founder' }] }),
    true,
  )
  assert.equal(
    canUpdateWorkspaceBranding({ roles: [{ role: 'Client' }] }),
    false,
  )

  config.adminEmails = ['owner@example.com']
  assert.equal(
    canUpdateWorkspaceBranding({ email: 'owner@example.com', roles: [] }),
    true,
  )

  // Saved branding wins over env config; blanks and unsafe logos still fall back.
  const stored = getPublicWorkspaceConfig({ name: 'Stored Co', tagline: '  ', logoUrl: 'javascript:alert(1)' })
  assert.equal(stored.name, 'Stored Co')
  assert.equal(stored.tagline, 'Client delivery hub')
  assert.equal(stored.logoUrl, null)
  assert.equal(stored.signInMessage, 'Sign in to your Stored Co workspace')
} finally {
  config.workspaceName = originalWorkspaceConfig.workspaceName
  config.workspaceLogoUrl = originalWorkspaceConfig.workspaceLogoUrl
  config.workspaceLogoAlt = originalWorkspaceConfig.workspaceLogoAlt
  config.workspaceTagline = originalWorkspaceConfig.workspaceTagline
  config.adminEmails = originalWorkspaceConfig.adminEmails
}

// Branding persists in the WorkspaceSetting row (2026-10-14), not a file Vercel never kept.
async function runBrandingPersistenceTests() {
  const people: Record<string, { id: string; email: string; roles: Array<{ role: string }> }> = {
    'u-admin': { id: 'u-admin', email: 'admin@example.test', roles: [{ role: 'admin' }] },
    'u-dev': { id: 'u-dev', email: 'dev@example.test', roles: [{ role: 'Frontend Developer' }] },
  }
  let row: { key: string; value: unknown } | null = null
  let readFails = false
  let writeFails = false
  const upserts: any[] = []
  const settings = prisma.workspaceSetting as any
  const users = prisma.user as any
  const saved = { findSetting: settings.findUnique, upsert: settings.upsert, findUser: users.findUnique }
  settings.findUnique = async () => {
    if (readFails) throw new Error('relation "WorkspaceSetting" does not exist')
    return row
  }
  settings.upsert = async (args: any) => {
    if (writeFails) throw new Error('relation "WorkspaceSetting" does not exist')
    upserts.push(args)
    row = { key: args.where.key, value: args.update.value }
    return row
  }
  users.findUnique = async (args: any) => {
    const person = people[args?.where?.id]
    return person ? { ...person, status: 'active', isApproved: true } : null
  }

  const app = express()
  app.use(express.json())
  app.use('/workspace', new WorkspaceController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const call = async (method: string, path: string, userId?: string, body?: unknown) => {
    const person = userId ? people[userId] : undefined
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(person ? { Authorization: `Bearer ${JwtService.generateAccessToken({ userId: person.id, email: person.email })}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() as any }
  }

  try {
    config.workspaceName = 'Env Name'
    assert.equal((await call('GET', '/workspace/public')).body.name, 'Env Name', 'no saved row: env config')

    const put = await call('PUT', '/workspace', 'u-admin', { name: 'Saved Name', tagline: 'Ops hub' })
    assert.equal(put.status, 200)
    assert.equal(put.body.config.name, 'Saved Name')
    assert.equal(upserts.length, 1)
    assert.equal(upserts[0].where.key, 'branding')
    assert.deepEqual(upserts[0].create.value, { name: 'Saved Name', tagline: 'Ops hub' })

    const reread = await call('GET', '/workspace/public')
    assert.equal(reread.body.name, 'Saved Name')
    assert.equal(reread.body.tagline, 'Ops hub')

    // A later edit merges into the saved row.
    await call('PUT', '/workspace', 'u-admin', { signInMessage: 'Welcome back' })
    assert.deepEqual(upserts[1].update.value, { name: 'Saved Name', tagline: 'Ops hub', signInMessage: 'Welcome back' })

    assert.equal((await call('PUT', '/workspace', 'u-dev', { name: 'Nope' })).status, 403)

    // Before the migration runs the table is missing: reads fall back, writes fail loudly.
    readFails = true
    const fallback = await call('GET', '/workspace/public')
    assert.equal(fallback.status, 200)
    assert.equal(fallback.body.name, 'Env Name')
    readFails = false
    writeFails = true
    assert.equal((await call('PUT', '/workspace', 'u-admin', { name: 'Lost' })).status, 500, 'a failed save is not reported as success')
  } finally {
    settings.findUnique = saved.findSetting
    settings.upsert = saved.upsert
    users.findUnique = saved.findUser
    config.workspaceName = originalWorkspaceConfig.workspaceName
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

runBrandingPersistenceTests()
  .then(() => console.log('workspace.config tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
