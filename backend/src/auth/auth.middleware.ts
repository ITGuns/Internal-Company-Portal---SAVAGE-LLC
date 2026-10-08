import { Request, Response, NextFunction } from 'express'
import { JwtService, JwtPayload } from './jwt.service'
import { isAdminEmail } from '../config/env.config'
import { hasFullAccess, normalizeOrgRoleName } from '../org/org-access-policy'
import { createLogger } from '../observability/logger'
import { checkAccountStatus } from './account-status'

const logger = createLogger('auth.middleware')

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
    user?: JwtPayload
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
        res.status(401).json({ error: 'Access token required' })
        return
    }

    let payload: JwtPayload
    try {
        payload = JwtService.verifyAccessToken(token)
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' })
        return
    }

    // Deactivated, unapproved or deleted accounts are refused even with a valid token.
    checkAccountStatus(payload.userId)
        .then((result) => {
            if (!result.ok && 'httpStatus' in result) {
                res.status(result.httpStatus).json({ error: result.message })
                return
            }
            req.user = payload
            next()
        })
        .catch((error) => {
            logger.error('Account status check failed', error)
            res.status(503).json({ error: 'Unable to verify your session. Try again shortly.' })
        })
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail if missing
 */
export function optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        next()
        return
    }

    let payload: JwtPayload
    try {
        payload = JwtService.verifyAccessToken(token)
    } catch {
        // Token invalid, but we don't fail - just continue without user
        next()
        return
    }

    // Same account check as authenticateToken: a deactivated, unapproved or
    // deleted account is treated as anonymous instead of attached.
    checkAccountStatus(payload.userId)
        .then((account) => {
            if (account.ok) req.user = payload
            next()
        })
        .catch((error) => {
            logger.error('Account status check failed', error)
            next()
        })
}

/**
 * Middleware factory to check for specific roles
 * Requires authenticateToken middleware to be run first
 */
export function requireRole(allowedRoles: string | string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Cast request to AuthRequest to access typed user
        const authReq = req as AuthRequest;

        // Ensure user is authenticated first
        if (!authReq.user || !authReq.user.userId) {
            res.status(401).json({ error: 'Authentication required' })
            return;
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
        const normalizedAllowedRoles = roles.map(normalizeOrgRoleName)

        try {
            const { prisma } = await import('../database/prisma.service');

            const userRoles = await prisma.userRole.findMany({
                where: {
                    userId: authReq.user!.userId,
                }
            })

            // Admin email bypass (configured via ADMIN_EMAILS env var)
            const isAuthorizedEmail = isAdminEmail(authReq.user!.email);
            const hasAllowedRole = userRoles.some((assignment) =>
                normalizedAllowedRoles.includes(normalizeOrgRoleName(assignment.role))
            )
            const hasGlobalFullAccess = hasFullAccess(userRoles)

            if (hasAllowedRole || hasGlobalFullAccess || isAuthorizedEmail) {
                next()
                return
            }

            res.status(403).json({ error: 'Insufficient permissions' })
            return
        } catch (error) {
            logger.error('Role verification error', error)
            res.status(500).json({ error: 'Internal server error during role verification' })
            return
        }
    }
}

/**
 * Middleware factory to check for specific departments
 * Requires authenticateToken middleware to be run first
 */
export function requireDepartment(allowedDepartments: string | string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthRequest;

        if (!authReq.user || !authReq.user.userId) {
            res.status(401).json({ error: 'Authentication required' })
            return;
        }

        const departments = Array.isArray(allowedDepartments) ? allowedDepartments : [allowedDepartments]

        try {
            // Import dynamically
            const { prisma } = await import('../database/prisma.service');

            // Find user roles where the department name matches one of the allowed ones
            const userRoles = await prisma.userRole.findMany({
                where: {
                    userId: authReq.user!.userId,
                    department: {
                        name: {
                            in: departments,
                            mode: 'insensitive' // Case insensitive check
                        }
                    }
                }
            })

            const allUserRoles = await prisma.userRole.findMany({
                where: { userId: authReq.user!.userId }
            });
            const isGlobalAdmin = hasFullAccess(allUserRoles);

            // Admin email bypass (configured via ADMIN_EMAILS env var)
            const isAuthorizedEmail = isAdminEmail(authReq.user!.email);

            if (userRoles.length > 0 || isGlobalAdmin || isAuthorizedEmail) {
                next()
                return
            }

            res.status(403).json({ error: `Access restricted to ${departments.join(', ')} department` })
            return
        } catch (error) {
            logger.error('Department verification error', error)
            res.status(500).json({ error: 'Internal server error during permission check' })
            return
        }
    }
}
