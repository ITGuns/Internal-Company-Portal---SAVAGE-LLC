import assert from 'node:assert/strict'
import { config } from '../src/config/env.config'
import {
  canUpdateWorkspaceBranding,
  getPublicWorkspaceConfig,
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
} finally {
  config.workspaceName = originalWorkspaceConfig.workspaceName
  config.workspaceLogoUrl = originalWorkspaceConfig.workspaceLogoUrl
  config.workspaceLogoAlt = originalWorkspaceConfig.workspaceLogoAlt
  config.workspaceTagline = originalWorkspaceConfig.workspaceTagline
  config.adminEmails = originalWorkspaceConfig.adminEmails
}
