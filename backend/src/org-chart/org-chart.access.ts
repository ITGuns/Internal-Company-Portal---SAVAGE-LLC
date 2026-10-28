import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import {
  hasFullAccess,
  hasInternalDirectoryAccess,
  hasManagementAccess,
} from '../org/org-access-policy'
import { hasEmployeeManagementAccess } from '../employees/employees.security'

/**
 * What the signed-in member may do on the org chart and with concerns.
 * Same role rules as the user directory and PATCH /api/users/:id, including
 * the ADMIN_EMAILS bypass, so the chart never offers an action the route refuses.
 */
export interface ViewerAccess {
  id: string
  displayName: string
  /** Internal directory access: GET /api/users rule. Client-only accounts are refused. */
  canReadDirectory: boolean
  /** PATCH /api/users/:id { managerId } rule (management roles or an ADMIN_EMAILS admin). */
  canEditReportingLines: boolean
  isFullAccess: boolean
  hasManagementAccess: boolean
}

export async function resolveViewerAccess(userId: string, email?: string | null): Promise<ViewerAccess> {
  const [roles, user] = await Promise.all([
    prisma.userRole.findMany({ where: { userId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ])
  const configuredAdmin = isAdminEmail(email ?? user?.email)

  return {
    id: userId,
    displayName: user?.name?.trim() || user?.email || 'A member',
    canReadDirectory: hasInternalDirectoryAccess(roles, configuredAdmin),
    canEditReportingLines: hasEmployeeManagementAccess(roles, configuredAdmin),
    isFullAccess: hasFullAccess(roles, configuredAdmin),
    hasManagementAccess: hasManagementAccess(roles, configuredAdmin),
  }
}
