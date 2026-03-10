import express, { Request, Response, Router } from 'express'
import passport from 'passport'
import crypto from 'crypto'
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

        // Standard Email/Password Signup
        router.post('/signup', async (req: Request, res: Response) => {
            const { name, email, password, departmentId, role } = req.body

            if (!email || !password || !name) {
                return res.status(400).json({ error: 'Name, email and password required' })
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' })
            }

            // Validate password strength
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' })
            }
            if (!/[A-Z]/.test(password)) {
                return res.status(400).json({ error: 'Password must contain at least one uppercase letter' })
            }
            if (!/\d/.test(password)) {
                return res.status(400).json({ error: 'Password must contain at least one number' })
            }

            try {
                const { prisma } = await import('../database/prisma.service');
                const bcrypt = await import('bcrypt');

                // Check if user exists
                const existing = await prisma.user.findUnique({ where: { email } })
                if (existing) {
                    return res.status(409).json({ error: 'User already exists' })
                }

                const passwordHash = await bcrypt.hash(password, 10)

                // Create user, profile and role in a transaction
                const user = await prisma.$transaction(async (tx) => {
                    const newUser = await tx.user.create({
                        data: {
                            email,
                            name,
                            password: passwordHash,
                            status: 'pending',
                            isApproved: false // Requires manager approval
                        }
                    })

                    // Create employee profile
                    await tx.employeeProfile.create({
                        data: {
                            userId: newUser.id,
                            jobTitle: role,
                            // departmentId: departmentId // Wait, check if the model has this
                        }
                    })

                    // Create user role
                    await tx.userRole.create({
                        data: {
                            userId: newUser.id,
                            role,
                            departmentId: departmentId || null
                        }
                    })

                    return newUser
                })

                res.status(201).json({
                    success: true,
                    message: 'User created successfully. Awaiting approval.',
                    user: { id: user.id, email: user.email, name: user.name }
                })
            } catch (error) {
                console.error('Signup failed:', error)
                res.status(500).json({ error: 'Signup failed' })
            }
        })

        // Standard Email/Password Login
        router.post('/login', async (req: Request, res: Response) => {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' })
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' })
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

        // Forgot Password — generate reset token and email it
        router.post('/forgot-password', async (req: Request, res: Response) => {
            const { email } = req.body

            if (!email) {
                return res.status(400).json({ error: 'Email is required' })
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' })
            }

            try {
                const { prisma } = await import('../database/prisma.service')

                const user = await prisma.user.findUnique({ where: { email } })

                // Always return success even if user not found (prevents email enumeration)
                if (!user) {
                    return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' })
                }

                // Generate secure random token
                const resetToken = crypto.randomBytes(32).toString('hex')
                const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
                const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        passwordResetToken: hashedToken,
                        passwordResetExpiry: expiresAt,
                    },
                })

                // Send email with unhashed token (user receives this)
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
                const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

                const { EmailService } = await import('../email/email.service')
                const emailService = EmailService.getInstance()
                await emailService.sendTemplateEmail(
                    email,
                    'Password Reset — SAVAGE LLC Portal',
                    'password_reset',
                    {
                        userName: user.name || 'User',
                        resetUrl,
                        expiresInMinutes: 60,
                    }
                )

                res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' })
            } catch (error) {
                console.error('Forgot password error:', error)
                res.status(500).json({ error: 'Failed to process password reset request' })
            }
        })

        // Reset Password — verify token and update password
        router.post('/reset-password', async (req: Request, res: Response) => {
            const { token, email, password } = req.body

            if (!token || !email || !password) {
                return res.status(400).json({ error: 'Token, email, and new password are required' })
            }

            // Validate password strength
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' })
            }
            if (!/[A-Z]/.test(password)) {
                return res.status(400).json({ error: 'Password must contain at least one uppercase letter' })
            }
            if (!/\d/.test(password)) {
                return res.status(400).json({ error: 'Password must contain at least one number' })
            }

            try {
                const { prisma } = await import('../database/prisma.service')
                const bcrypt = await import('bcrypt')

                // Hash the token from the URL to compare with stored hash
                const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

                const user = await prisma.user.findFirst({
                    where: {
                        email,
                        passwordResetToken: hashedToken,
                        passwordResetExpiry: { gt: new Date() },
                    },
                })

                if (!user) {
                    return res.status(400).json({ error: 'Invalid or expired reset token' })
                }

                const passwordHash = await bcrypt.hash(password, 10)

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        password: passwordHash,
                        passwordResetToken: null,
                        passwordResetExpiry: null,
                    },
                })

                res.json({ success: true, message: 'Password has been reset successfully' })
            } catch (error) {
                console.error('Reset password error:', error)
                res.status(500).json({ error: 'Failed to reset password' })
            }
        })


        return router
    }
}
