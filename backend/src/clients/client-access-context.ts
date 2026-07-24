import type { Request } from 'express'
import { AuthRequest } from '../auth/auth.middleware'
import { isAdminEmail } from '../config/env.config'
import { prisma } from '../database/prisma.service'
import { hasClientManagementAccess, type ClientAccessContext } from './clients.access'

/**
 * Resolve the caller's client-portal access context (privilege + active memberships) from the
 * request. Extracted so the Gemfield guard and ClientsController share ONE resolver rather than
 * two copies - the entitlement layer must never drift from the base client-scoping layer.
 */
export async function resolveClientAccessContext(req: Request): Promise<ClientAccessContext | null> {
  const authReq = req as AuthRequest
  const requesterId = authReq.user?.userId
  if (!requesterId) return null

  const [roles, memberships] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId: requesterId },
      select: { role: true },
    }),
    prisma.clientMembership.findMany({
      where: {
        userId: requesterId,
        status: 'active',
        organization: { status: 'active' },
      },
      select: {
        organizationId: true,
        role: true,
        status: true,
      },
    }),
  ])

  return {
    requesterId,
    isPrivileged: hasClientManagementAccess(roles, isAdminEmail(authReq.user?.email)),
    memberships,
  }
}
