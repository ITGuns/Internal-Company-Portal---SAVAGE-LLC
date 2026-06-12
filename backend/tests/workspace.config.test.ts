import assert from 'node:assert/strict'
import { config } from '../src/config/env.config'
import { getPublicWorkspaceConfig } from '../src/workspace/workspace.controller'

const originalWorkspaceConfig = {
  workspaceName: config.workspaceName,
  workspaceLogoUrl: config.workspaceLogoUrl,
  workspaceLogoAlt: config.workspaceLogoAlt,
  workspaceTagline: config.workspaceTagline,
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
} finally {
  config.workspaceName = originalWorkspaceConfig.workspaceName
  config.workspaceLogoUrl = originalWorkspaceConfig.workspaceLogoUrl
  config.workspaceLogoAlt = originalWorkspaceConfig.workspaceLogoAlt
  config.workspaceTagline = originalWorkspaceConfig.workspaceTagline
}
