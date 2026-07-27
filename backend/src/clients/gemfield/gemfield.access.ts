import type { NextFunction, Request, Response } from 'express'
import { ClientAccessContext, canReadClientOrganization } from '../clients.access'

// GF-ID format: GF-{YYYY}-{seq}. Mirrors gem/src/lib/intake/store.ts, which stores a
// 4-padded yearly counter but accepts 1+ digits (^GF-\d{4}-\d+$).
export const GF_ID_PATTERN = /^GF-\d{4}-\d+$/

export function normalizeGfId(value: string): string {
  return String(value ?? '').trim().toUpperCase()
}

export function isValidGfId(value: unknown): boolean {
  return typeof value === 'string' && GF_ID_PATTERN.test(normalizeGfId(value))
}

export interface GemfieldEntitledOrganization {
  id: string
  status?: string | null
  gemfieldClient: boolean
}

/**
 * The entitlement predicate. The Gemfield module is gated on the org's `gemfieldClient`
 * flag for EVERYONE, staff included: a non-entitled org exposes no Gemfield surface at all
 * ("absent, not grayed"). For an entitled org, normal client-org read scoping applies
 * (privileged staff, or an active member of that org). Denial is total; callers map it to
 * 404 - never 403 - so a non-entitled or cross-org caller cannot even detect the module exists.
 */
export function canAccessGemfieldOrg(
  access: ClientAccessContext | null | undefined,
  organization: GemfieldEntitledOrganization | null | undefined,
): boolean {
  if (!access || !organization) return false
  if (!organization.gemfieldClient) return false
  return canReadClientOrganization(access, { id: organization.id, status: organization.status })
}

/** Org ids the caller may see Gemfield data for: entitled orgs that are also readable by them. */
export function filterAccessibleGemfieldOrgIds(
  access: ClientAccessContext,
  entitledOrgs: GemfieldEntitledOrganization[],
): string[] {
  return entitledOrgs
    .filter((organization) => canAccessGemfieldOrg(access, organization))
    .map((organization) => organization.id)
}

// --- Express guard -----------------------------------------------------------------
// Dependency-injected so it is unit-testable without a live DB and so route handlers stay
// thin. Wired to concrete Prisma loaders when the first Gemfield route lands (P2). Every
// Gemfield route composes this single guard - there is no bespoke per-route auth check.

export interface GemfieldGuardDeps {
  resolveAccess(req: Request): Promise<ClientAccessContext | null>
  loadOrganization(organizationId: string): Promise<GemfieldEntitledOrganization | null>
  getOrganizationId?(req: Request): string | undefined
}

export interface GemfieldRequest extends Request {
  gemfieldOrganization?: GemfieldEntitledOrganization
  gemfieldAccess?: ClientAccessContext
}

function defaultOrganizationId(req: Request): string | undefined {
  const params = (req.params ?? {}) as Record<string, unknown>
  const value = params.organizationId ?? params.orgId
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' ? value : undefined
}

// Deny bodies are static and carry NO record data - no existence disclosure, no org fields.
const NOT_FOUND_BODY = { error: 'Not found' } as const
const UNAUTHENTICATED_BODY = { error: 'Authentication required' } as const

export function requireGemfieldClient(deps: GemfieldGuardDeps) {
  const getOrganizationId = deps.getOrganizationId ?? defaultOrganizationId

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const access = await deps.resolveAccess(req)
    if (!access) {
      res.status(401).json(UNAUTHENTICATED_BODY)
      return
    }

    const organizationId = getOrganizationId(req)
    if (!organizationId) {
      res.status(404).json(NOT_FOUND_BODY)
      return
    }

    const organization = await deps.loadOrganization(organizationId)
    if (!canAccessGemfieldOrg(access, organization)) {
      res.status(404).json(NOT_FOUND_BODY)
      return
    }

    const gemfieldReq = req as GemfieldRequest
    gemfieldReq.gemfieldAccess = access
    gemfieldReq.gemfieldOrganization = organization ?? undefined
    next()
  }
}
