import express, { Request, Response, Router } from 'express'
import passport from 'passport'
import { JwtService } from './jwt.service'
import { User } from '@prisma/client'

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
        router.get('/me', (req: Request, res: Response) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' })
            }

            res.json({
                user: req.user,
            })
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

                const email = req.body.email || 'john.doe@savage.com'
                const user = await prisma.user.findUnique({
                    where: { email }
                })

                if (!user) {
                    return res.status(404).json({ error: 'Dev user not found' })
                }

                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })

                res.json({
                    success: true,
                    user,
                    tokens
                })
            } catch (error) {
                res.status(500).json({ error: 'Dev login failed' })
            }
        })


        return router
    }
}
