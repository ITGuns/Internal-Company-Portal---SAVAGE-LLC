import { Request, Response, NextFunction } from 'express'
import { JwtService, JwtPayload } from './jwt.service'

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
