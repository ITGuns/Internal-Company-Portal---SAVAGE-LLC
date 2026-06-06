import { Request, Response, NextFunction } from 'express'
import { JwtService, JwtPayload } from './jwt.service'
import { isAdminEmail } from '../config/env.config'
import { hasFullAccess, normalizeOrgRoleName } from '../org/org-access-policy'

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

    try {
        const payload = JwtService.verifyAccessToken(token)
        req.user = payload
        next()
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' })
        return
    }
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

    if (token) {
        try {
            const payload = JwtService.verifyAccessToken(token)
            req.user = payload
        } catch (error) {
            // Token invalid, but we don't fail - just continue without user
        }
    }

    next()
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
            console.error('Role verification error:', error)
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
            console.error('Department verification error:', error)
            res.status(500).json({ error: 'Internal server error during permission check' })
            return
        }
    }
}
