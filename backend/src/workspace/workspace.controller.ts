import express, { Request, Response, Router } from 'express'
import type { Prisma } from '@prisma/client'
import { config, isAdminEmail } from '../config/env.config'
import { authenticateToken } from '../auth/auth.middleware'
import { hasManagementAccess, type OrgRoleLike } from '../org/org-access-policy'
import { prisma } from '../database/prisma.service'
import fs from 'fs'
import path from 'path'
import { createLogger } from '../observability/logger'

// Branding lives in the WorkspaceSetting row "branding" since 2026-10-14. The old
// JSON file is read-only fallback for one release (Vercel never kept writes to it).
const BRANDING_SETTING_KEY = 'branding'
const BRANDING_FILE_PATH = path.resolve(__dirname, '../../../workspace-branding.json')
const logger = createLogger('workspace.controller')

export interface PublicWorkspaceConfig {
  name: string
  logoUrl: string | null
  logoAlt: string
  tagline: string
  signInMessage: string
}

interface WorkspaceBrandingUser {
  email?: string | null
  roles?: OrgRoleLike[] | null
}

export function canUpdateWorkspaceBranding(
  user?: WorkspaceBrandingUser | null,
  tokenEmail?: string | null,
): boolean {
  return hasManagementAccess(user?.roles || [], isAdminEmail(user?.email || tokenEmail))
}

function sanitizePublicImageUrl(value?: string): string | null {
  if (!value) return null

  const logoUrl = value.trim()
  if (!logoUrl || /[\s\\\u0000-\u001f\u007f]/.test(logoUrl)) return null

  if (logoUrl.startsWith('/') && !logoUrl.startsWith('//')) return logoUrl

  try {
    const parsed = new URL(logoUrl)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? logoUrl
      : null
  } catch {
    return null
  }
}

function loadBrandingFromFile(): Partial<PublicWorkspaceConfig> {
  try {
    if (fs.existsSync(BRANDING_FILE_PATH)) {
      const content = fs.readFileSync(BRANDING_FILE_PATH, 'utf8')
      return JSON.parse(content)
    }
  } catch (error) {
    logger.error('Failed to load branding file', error)
  }
  return {}
}

/** Saved branding: the database row, else the old file. A missing table falls back too. */
async function loadStoredBranding(): Promise<Partial<PublicWorkspaceConfig>> {
  try {
    const row = await prisma.workspaceSetting.findUnique({ where: { key: BRANDING_SETTING_KEY } })
    const value = row?.value
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Partial<PublicWorkspaceConfig>
    }
  } catch (error) {
    logger.error('Failed to read workspace branding; using the file fallback', error)
  }
  return loadBrandingFromFile()
}

/** Public branding: saved values first, then env config, then defaults. */
export function getPublicWorkspaceConfig(stored: Partial<PublicWorkspaceConfig> = {}): PublicWorkspaceConfig {
  const name = stored.name?.trim() || config.workspaceName.trim() || 'Deskii'
  const logoUrl = sanitizePublicImageUrl(stored.logoUrl || config.workspaceLogoUrl)
  const tagline = stored.tagline?.trim() || config.workspaceTagline.trim() || 'Your workspace'

  return {
    name,
    logoUrl,
    logoAlt: stored.logoAlt?.trim() || config.workspaceLogoAlt?.trim() || `${name} logo`,
    tagline,
    signInMessage: stored.signInMessage?.trim() || `Sign in to your ${name} workspace`,
  }
}

export class WorkspaceController {
  router(): Router {
    const router = express.Router()

    // Public by design: the login page needs safe branding before authentication.
    router.get('/public', async (req: Request, res: Response) => {
      // Cache for 5 minutes — branding rarely changes
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
      res.json(getPublicWorkspaceConfig(await loadStoredBranding()))
    })

    // Edit branding configuration (Admin/Operations access only)
    router.put('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const authReq = req as any
        const user = await prisma.user.findUnique({
          where: { id: authReq.user.userId },
          include: { roles: true }
        })

        if (!canUpdateWorkspaceBranding(user, authReq.user?.email)) {
          return res.status(403).json({ error: 'Forbidden' })
        }

        const { name, logoUrl, logoAlt, tagline, signInMessage } = req.body
        const newConfig: Partial<PublicWorkspaceConfig> = { ...(await loadStoredBranding()) }

        if (name !== undefined) newConfig.name = String(name).trim()
        if (logoUrl !== undefined) newConfig.logoUrl = logoUrl ? String(logoUrl).trim() : ''
        if (logoAlt !== undefined) newConfig.logoAlt = String(logoAlt).trim()
        if (tagline !== undefined) newConfig.tagline = String(tagline).trim()
        if (signInMessage !== undefined) newConfig.signInMessage = String(signInMessage).trim()

        const value = newConfig as Prisma.InputJsonObject
        await prisma.workspaceSetting.upsert({
          where: { key: BRANDING_SETTING_KEY },
          create: { key: BRANDING_SETTING_KEY, value },
          update: { value },
        })
        res.json({ success: true, config: getPublicWorkspaceConfig(newConfig) })
      } catch (error) {
        logger.error('Failed to update workspace branding', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    return router
  }
}
