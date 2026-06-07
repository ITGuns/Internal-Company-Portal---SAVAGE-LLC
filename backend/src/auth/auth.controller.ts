import express, { Request, Response, Router } from 'express'
import passport from 'passport'
import crypto from 'crypto'
import { JwtService, JwtPayload } from './jwt.service'
import { User } from '@prisma/client'
import { authenticateToken, AuthRequest } from './auth.middleware'
import { buildPendingSignupProfile, canLoginApprovedUser } from './signup.requests'
import { canIssueAuthTokens, serializeAuthUser } from './auth.security'
import {
    clearRefreshTokenCookie,
    getRefreshTokenFromRequest,
    setRefreshTokenCookie,
} from './auth.session'
import {
    hasConfiguredSignupRolesForDepartment,
    isDefaultSignupRoleAllowed,
    normalizeSignupOption,
} from './signup-role-options'
import { createAuthRateLimiters, type AuthRateLimiters } from '../security/rate-limits'
import { createLogger } from '../observability/logger'

const logger = createLogger('auth.controller')

interface AuthControllerOptions {
    rateLimiters?: AuthRateLimiters
}

export class AuthController {
    private readonly rateLimiters: AuthRateLimiters

    constructor(options: AuthControllerOptions = {}) {
        this.rateLimiters = options.rateLimiters || createAuthRateLimiters()
    }

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
                if (!canIssueAuthTokens(user)) {
                    return res.status(403).json({ error: 'Account pending approval' })
                }

                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })
                setRefreshTokenCookie(res, tokens.refreshToken)

                res.json({
                    success: true,
                    user: serializeAuthUser(user),
                    tokens: { accessToken: tokens.accessToken },
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
                if (!canIssueAuthTokens(user)) {
                    return res.status(403).json({ error: 'Account pending approval' })
                }

                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })
                setRefreshTokenCookie(res, tokens.refreshToken)

                res.json({
                    success: true,
                    user: serializeAuthUser(user),
                    tokens: { accessToken: tokens.accessToken },
                })
            }
        )

        // Standard Email/Password Signup
        router.post('/signup', this.rateLimiters.signup, async (req: Request, res: Response) => {
            const { name, email, password, departmentId, role } = req.body

            if (!email || !password || !name) {
                return res.status(400).json({ error: 'Name, email and password required' })
            }

            if (!departmentId || !role) {
                return res.status(400).json({ error: 'Department and role are required' })
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

                const department = await prisma.department.findUnique({ where: { id: departmentId } })
                if (!department) {
                    return res.status(400).json({ error: 'Invalid department' })
                }

                const availableRoles = await prisma.availableRole.findMany({
                    where: {
                        OR: [
                            { departmentId },
                            { departmentId: null },
                        ],
                    },
                })
                const availableRole = availableRoles.find(
                    (candidate) => normalizeSignupOption(candidate.name) === normalizeSignupOption(role),
                )
                const hasDepartmentRoles = hasConfiguredSignupRolesForDepartment(availableRoles, departmentId)
                const usesFallbackRole = !hasDepartmentRoles && isDefaultSignupRoleAllowed(department.name, role)
                if (!availableRole && !usesFallbackRole) {
                    return res.status(400).json({ error: 'Invalid role for selected department' })
                }

                // Create user and pending profile in a transaction. Active authorization
                // roles are assigned only after manager approval.
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
                            ...buildPendingSignupProfile({ role, departmentId }),
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
                logger.error('Signup failed', error)
                res.status(500).json({ error: 'Signup failed' })
            }
        })

        // Standard Email/Password Login
        router.post('/login', this.rateLimiters.login, async (req: Request, res: Response) => {
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

                if (!canLoginApprovedUser(user)) {
                    return res.status(403).json({ error: 'Account pending approval' })
                }

                const tokens = JwtService.generateTokenPair({
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                })
                setRefreshTokenCookie(res, tokens.refreshToken)

                res.json({
                    success: true,
                    user: serializeAuthUser(user),
                    tokens: { accessToken: tokens.accessToken },
                })
            } catch (error) {
                logger.error('Login failed', error)
                res.status(500).json({ error: 'Login failed' })
            }
        })

        // Refresh token endpoint
        router.post('/refresh', async (req: Request, res: Response) => {
            const refreshToken = getRefreshTokenFromRequest(req)

            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' })
            }

            let payload: JwtPayload
            try {
                payload = JwtService.verifyRefreshToken(refreshToken)
            } catch (error) {
                return res.status(403).json({ error: 'Invalid or expired refresh token' })
            }

            try {
                const { prisma } = await import('../database/prisma.service')
                const user = await prisma.user.findUnique({
                    where: { id: payload.userId },
                })

                if (!user || !canIssueAuthTokens(user)) {
                    return res.status(403).json({ error: 'Account pending approval' })
                }

                const tokenPayload: JwtPayload = {
                    userId: user.id,
                    email: user.email,
                    name: user.name || undefined,
                }
                const newAccessToken = JwtService.generateAccessToken(tokenPayload)
                const newRefreshToken = JwtService.generateRefreshToken(tokenPayload)
                setRefreshTokenCookie(res, newRefreshToken)

                res.json({
                    accessToken: newAccessToken,
                })
            } catch (error) {
                logger.error('Refresh token rotation failed', error)
                res.status(500).json({ error: 'Unable to refresh token' })
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

                res.json({
                    user: serializeAuthUser(user),
                })
            } catch (error) {
                logger.error('Failed to fetch user in /me', error)
                res.status(500).json({ error: 'Internal server error' })
            }
        })

        // Logout clears the browser refresh cookie; client-side should delete access token state.
        router.post('/logout', (req: Request, res: Response) => {
            clearRefreshTokenCookie(res)
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
        router.post('/forgot-password', this.rateLimiters.forgotPassword, async (req: Request, res: Response) => {
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
                logger.error('Forgot password error', error)
                res.status(500).json({ error: 'Failed to process password reset request' })
            }
        })

        // Reset Password — verify token and update password
        router.post('/reset-password', this.rateLimiters.resetPassword, async (req: Request, res: Response) => {
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
                logger.error('Reset password error', error)
                res.status(500).json({ error: 'Failed to reset password' })
            }
        })


        return router
    }
}
