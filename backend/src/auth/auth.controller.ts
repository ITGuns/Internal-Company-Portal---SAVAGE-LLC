import express, { Request, Response, Router } from 'express'
import passport from 'passport'
import { JwtService, JwtPayload } from './jwt.service'
import { User } from '@prisma/client'
import { authenticateToken, AuthRequest } from './auth.middleware'

export class AuthController {
    router(): Router {
        const router = express.Router()

        // Google OAuth routes
        router.get(
            '/google',
            passport.authenticate('google', { scope: ['profile', 'email'], session: false })
        )

        router.get(
            '/google/callback',
            passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
            (req: Request, res: Response) => {
                const user = req.user as User
                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })

                // In production, redirect to frontend with tokens
                // For now, return JSON
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                    },
                    tokens,
                })
            }
        )

        // Discord OAuth routes
        router.get(
            '/discord',
            passport.authenticate('discord', { session: false })
        )

        router.get(
            '/discord/callback',
            passport.authenticate('discord', { session: false, failureRedirect: '/auth/failure' }),
            (req: Request, res: Response) => {
                const user = req.user as User
                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })

                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                    },
                    tokens,
                })
            }
        )

        // Standard Email/Password Login
        router.post('/login', async (req: Request, res: Response) => {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' })
            }

            try {
                const { prisma } = await import('../database/prisma.service');
                const bcrypt = await import('bcrypt');

                const user = await prisma.user.findUnique({
                    where: { email },
                    include: { roles: true }
                })

                if (!user || !user.password) {
                    return res.status(401).json({ error: 'Invalid credentials' })
                }

                const valid = await bcrypt.compare(password, user.password)
                if (!valid) {
                    return res.status(401).json({ error: 'Invalid credentials' })
                }

                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })

                // Map roles for cleaner frontend usage
                const roleList = user.roles.map(r => r.role)
                const primaryRole = roleList.includes('admin') ? 'admin' : roleList[0] || 'member'

                res.json({
                    success: true,
                    user: {
                        ...user,
                        password: '', // Redact password
                        role: primaryRole,
                        roles: roleList
                    },
                    tokens,
                })
            } catch (error) {
                console.error('Login failed:', error)
                res.status(500).json({ error: 'Login failed' })
            }
        })

        // Refresh token endpoint
        router.post('/refresh', (req: Request, res: Response) => {
            const { refreshToken } = req.body

            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' })
            }

            try {
                const payload = JwtService.verifyRefreshToken(refreshToken)
                const newAccessToken = JwtService.generateAccessToken(payload)

                res.json({
                    accessToken: newAccessToken,
                })
            } catch (error) {
                res.status(403).json({ error: 'Invalid or expired refresh token' })
            }
        })

        // Get current user (requires authentication)
        // Check database to ensure user still exists (in case of deletion)
        router.get('/me', authenticateToken, async (req: Request, res: Response) => {
            const authReq = req as AuthRequest
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Not authenticated' })
            }

            try {
                // Import dynamically to avoid circular dependencies
                const { prisma } = await import('../database/prisma.service');

                const user = await prisma.user.findUnique({
                    where: { id: authReq.user.userId },
                    include: { roles: true }
                })

                if (!user) {
                    return res.status(401).json({ error: 'User no longer exists' })
                }

                // Map roles for cleaner frontend usage
                const roleList = user.roles.map(r => r.role)
                const primaryRole = roleList.includes('admin') ? 'admin' : roleList[0] || 'member'

                res.json({
                    user: {
                        ...user,
                        password: '', // Redact password
                        role: primaryRole,
                        roles: roleList
                    },
                })
            } catch (error) {
                console.error('Failed to fetch user in /me:', error)
                res.status(500).json({ error: 'Internal server error' })
            }
        })

        // Logout (client-side should delete tokens)
        router.post('/logout', (req: Request, res: Response) => {
            res.json({ success: true, message: 'Logged out successfully' })
        })

        // Failure redirect
        router.get('/failure', (req: Request, res: Response) => {
            res.status(401).json({
                error: 'Authentication failed',
                message: 'Could not authenticate with the provider',
            })
        })


        // ⚠️ SECURITY WARNING: DEV LOGIN ENABLED FOR TESTING ONLY
        // This bypasses authentication and MUST be disabled in production
        // Checks NODE_ENV to prevent accidental exposure
        router.post('/dev-login', async (req: Request, res: Response) => {
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({ error: 'Not available in production' })
            }

            try {
                // Import dynamically to avoid circular dependencies issues if any
                const { prisma } = await import('../database/prisma.service');

                const email = req.body.email || 'admin@savage.com' // Default to Admin

                // Try to find user, or create if missing (Dev convenience)
                let user = await prisma.user.findUnique({
                    where: { email },
                    include: { roles: true }
                })

                if (!user) {
                    console.log(`[Dev Login] Creating new dev user: ${email}`)
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: 'Admin User',
                            avatar: `https://ui-avatars.com/api/?name=Admin+User&background=random`,
                            status: 'active',
                            isApproved: true
                        },
                        include: { roles: true }
                    })
                }

                // Ensure the user has the 'admin' role in UserRole table for RBAC to work
                const existingRole = user.roles.find(r => r.role === 'admin' && r.departmentId === null);

                if (!existingRole) {
                    await prisma.userRole.create({
                        data: {
                            userId: user.id,
                            role: 'admin',
                            departmentId: null
                        }
                    })
                    // Refresh user data with roles
                    user = await prisma.user.findUnique({
                        where: { id: user.id },
                        include: { roles: true }
                    }) as any
                }

                const tokens = JwtService.generateTokenPair({
                    userId: user!.id,
                    email: user!.email,
                    name: user!.name || undefined,
                })

                const roleList = user!.roles.map(r => r.role)
                const primaryRole = roleList.includes('admin') ? 'admin' : roleList[0] || 'member'

                res.json({
                    success: true,
                    user: {
                        ...user,
                        password: '',
                        role: primaryRole,
                        roles: roleList
                    },
                    tokens
                })
            } catch (error) {
                console.error('Dev login failed:', error)
                res.status(500).json({ error: 'Dev login failed' })
            }
        })


        return router
    }
}
