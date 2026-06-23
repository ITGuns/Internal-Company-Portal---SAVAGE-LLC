import express, { Request, Response, Router } from 'express'
import { config, isAdminEmail } from '../config/env.config'
import { authenticateToken } from '../auth/auth.middleware'
import { hasManagementAccess, type OrgRoleLike } from '../org/org-access-policy'
import fs from 'fs'
import path from 'path'
import { createLogger } from '../observability/logger'

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

function saveBrandingToFile(data: Partial<PublicWorkspaceConfig>): void {
  try {
    fs.writeFileSync(BRANDING_FILE_PATH, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    logger.error('Failed to save branding file', error)
  }
}

export function getPublicWorkspaceConfig(): PublicWorkspaceConfig {
  const fileConfig = loadBrandingFromFile()
  const name = fileConfig.name?.trim() || config.workspaceName.trim() || 'Deskii'
  const logoUrl = sanitizePublicImageUrl(fileConfig.logoUrl || config.workspaceLogoUrl)
  const tagline = fileConfig.tagline?.trim() || config.workspaceTagline.trim() || 'Your workspace'

  return {
    name,
    logoUrl,
    logoAlt: fileConfig.logoAlt?.trim() || config.workspaceLogoAlt?.trim() || `${name} logo`,
    tagline,
    signInMessage: fileConfig.signInMessage?.trim() || `Sign in to your ${name} workspace`,
  }
}

export class WorkspaceController {
  router(): Router {
    const router = express.Router()

    // Public by design: the login page needs safe branding before authentication.
    router.get('/public', (req: Request, res: Response) => {
      // Cache for 5 minutes — branding rarely changes
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
      res.json(getPublicWorkspaceConfig())
    })

    // Edit branding configuration (Admin/Operations access only)
    router.put('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const authReq = req as any
        const { prisma } = await import('../database/prisma.service')
        const user = await prisma.user.findUnique({
          where: { id: authReq.user.userId },
          include: { roles: true }
        })

        if (!canUpdateWorkspaceBranding(user, authReq.user?.email)) {
          return res.status(403).json({ error: 'Forbidden' })
        }

        const { name, logoUrl, logoAlt, tagline, signInMessage } = req.body
        const newConfig: Partial<PublicWorkspaceConfig> = loadBrandingFromFile()

        if (name !== undefined) newConfig.name = String(name).trim()
        if (logoUrl !== undefined) newConfig.logoUrl = logoUrl ? String(logoUrl).trim() : ''
        if (logoAlt !== undefined) newConfig.logoAlt = String(logoAlt).trim()
        if (tagline !== undefined) newConfig.tagline = String(tagline).trim()
        if (signInMessage !== undefined) newConfig.signInMessage = String(signInMessage).trim()

        saveBrandingToFile(newConfig)
        res.json({ success: true, config: getPublicWorkspaceConfig() })
      } catch (error) {
        logger.error('Failed to update workspace branding', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    return router
  }
}
