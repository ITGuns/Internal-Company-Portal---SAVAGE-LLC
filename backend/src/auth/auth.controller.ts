import express, { Request, Response, Router } from 'express'
import passport from 'passport'
import crypto from 'crypto'
import { JwtService, JwtPayload } from './jwt.service'
import { authenticateToken, AuthRequest } from './auth.middleware'
import { buildPendingSignupProfile, canLoginApprovedUser } from './signup.requests'
import {
    authPasswordResetUserSelect,
    authTokenUserSelect,
    authUserSelect,
    canIssueAuthTokens,
    serializeAuthUser,
    type AuthUserLike,
} from './auth.security'
import {
    clearRefreshTokenCookie,
    getRefreshTokenFromRequest,
    setRefreshTokenCookie,
} from './auth.session'
import { RefreshSessionService } from './refresh-session.service'
import {
    hasConfiguredSignupRolesForDepartment,
    isDefaultSignupRoleAllowed,
    normalizeSignupOption,
} from './signup-role-options'
import { createAuthRateLimiters, type AuthRateLimiters } from '../security/rate-limits'
import {
    buildAppleAuthorizationUrl,
    buildOAuthFrontendRedirect,
    clearAppleOAuthStateCookie,
    createOAuthState,
    exchangeAppleAuthorizationCode,
    findOrCreateAppleOAuthUser,
    getAppleOAuthStateFromRequest,
    getFrontendUrl,
    isAppleOAuthConfigured,
    parseAppleUserName,
    setAppleOAuthStateCookie,
    verifyAppleIdentityToken,
    type OAuthProvider,
} from './oauth.helpers'

import { config } from '../config/env.config'

interface AuthControllerOptions {
    rateLimiters?: AuthRateLimiters
}

export class AuthController {
    private readonly rateLimiters: AuthRateLimiters
    private readonly refreshSessions = new RefreshSessionService()

    constructor(options: AuthControllerOptions = {}) {
        this.rateLimiters = options.rateLimiters || createAuthRateLimiters()
    }

    private async completeOAuthLogin(
        provider: OAuthProvider,
        user: AuthUserLike,
        req: Request,
        res: Response,
    ): Promise<void> {
        if (!canIssueAuthTokens(user)) {
            res.redirect(buildOAuthFrontendRedirect(provider, 'pending'))
            return
        }

        const tokens = JwtService.generateTokenPair({
            userId: user.id,
            email: user.email,
            name: user.name || undefined,
        })
        await this.refreshSessions.create(user.id, tokens.refreshToken, req)
        setRefreshTokenCookie(res, tokens.refreshToken)
        res.redirect(buildOAuthFrontendRedirect(provider))
    }

    router(): Router {
        const router = express.Router()

        // Sandbox bypass endpoint for development
        router.get('/sandbox', async (req: Request, res: Response) => {
            const provider = req.query.provider as string || 'google'
            const email = req.query.email as string
            const name = req.query.name as string || 'Sandbox User'

            if (!email) {
                return res.redirect(buildOAuthFrontendRedirect(provider as any, 'failed'))
            }

            if (config.nodeEnv === 'production') {
                return res.redirect(buildOAuthFrontendRedirect(provider as any, 'failed'))
            }

            try {
                const { prisma } = await import('../database/prisma.service')
                let user = await prisma.user.findUnique({
                    where: { email: email.trim().toLowerCase() },
                    select: authUserSelect,
                })

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email: email.trim().toLowerCase(),
                            name,
                            status: 'verified',
                            isApproved: true,
                        },
                        select: authUserSelect,
                    })
                }

                await this.completeOAuthLogin(provider as any, user, req, res)
            } catch (error) {
                console.error('Sandbox login failed:', error)
                res.redirect(buildOAuthFrontendRedirect(provider as any, 'failed'))
            }
        })

        // Google OAuth routes
        router.get('/google', (req: Request, res: Response, next) => {
            if (!config.googleClientId || !config.googleClientSecret) {
                if (config.nodeEnv === 'production') {
                    return res.redirect(buildOAuthFrontendRedirect('google', 'not_configured'))
                }
                return res.redirect(`${getFrontendUrl()}/auth/sandbox?provider=google`)
            }
            passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next)
        })

        router.get(
            '/google/callback',
            (req: Request, res: Response, next) => {
                passport.authenticate('google', { session: false }, async (error: Error | null, user?: AuthUserLike) => {
                    if (error || !user) {
                        return res.redirect(buildOAuthFrontendRedirect('google', 'failed'))
                    }
                    try {
                        await this.completeOAuthLogin('google', user, req, res)
                    } catch (loginError) {
                        console.error('Google OAuth session failed:', loginError)
                        res.redirect(buildOAuthFrontendRedirect('google', 'failed'))
                    }
                })(req, res, next)
            }
        )

        // Discord OAuth routes
        router.get(
            '/discord',
            passport.authenticate('discord', { session: false })
        )

        router.get(
            '/discord/callback',
            (req: Request, res: Response, next) => {
                passport.authenticate('discord', { session: false }, async (error: Error | null, user?: AuthUserLike) => {
                    if (error || !user) {
                        return res.redirect(buildOAuthFrontendRedirect('discord', 'failed'))
                    }
                    try {
                        await this.completeOAuthLogin('discord', user, req, res)
                    } catch (loginError) {
                        console.error('Discord OAuth session failed:', loginError)
                        res.redirect(buildOAuthFrontendRedirect('discord', 'failed'))
                    }
                })(req, res, next)
            }
        )

        // Apple OAuth routes
        router.get('/apple', (req: Request, res: Response) => {
            if (!isAppleOAuthConfigured()) {
                if (config.nodeEnv === 'production') {
                    return res.redirect(buildOAuthFrontendRedirect('apple', 'not_configured'))
                }
                return res.redirect(`${getFrontendUrl()}/auth/sandbox?provider=apple`)
            }

            const state = createOAuthState()
            setAppleOAuthStateCookie(res, state)
            res.redirect(buildAppleAuthorizationUrl(state))
        })

        const handleAppleCallback = async (req: Request, res: Response) => {
            try {
                const callbackState = typeof req.body?.state === 'string'
                    ? req.body.state
                    : typeof req.query.state === 'string'
                        ? req.query.state
                        : ''
                const storedState = getAppleOAuthStateFromRequest(req)
                clearAppleOAuthStateCookie(res)

                if (!callbackState || !storedState || callbackState !== storedState) {
                    return res.redirect(buildOAuthFrontendRedirect('apple', 'state_mismatch'))
                }

                const code = typeof req.body?.code === 'string'
                    ? req.body.code
                    : typeof req.query.code === 'string'
                        ? req.query.code
                        : ''
                if (!code) {
                    return res.redirect(buildOAuthFrontendRedirect('apple', 'failed'))
                }

                const tokenResponse = await exchangeAppleAuthorizationCode(code)
                const identity = await verifyAppleIdentityToken(tokenResponse.id_token || '')
                const appleName = parseAppleUserName(req.body?.user)
                const user = await findOrCreateAppleOAuthUser({
                    email: identity.email || '',
                    name: appleName,
                })

                await this.completeOAuthLogin('apple', user, req, res)
            } catch (error) {
                console.error('Apple OAuth callback error:', error)
                res.redirect(buildOAuthFrontendRedirect('apple', 'failed'))
            }
        }

        router.post('/apple/callback', express.urlencoded({ extended: false }), handleAppleCallback)
        router.get('/apple/callback', handleAppleCallback)

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
                const existing = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true },
                })
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
                        },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
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
                console.error('Signup failed:', error)
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
                    select: authUserSelect,
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
                await this.refreshSessions.create(user.id, tokens.refreshToken, req)
                setRefreshTokenCookie(res, tokens.refreshToken)

                res.json({
                    success: true,
                    user: serializeAuthUser(user),
                    tokens: { accessToken: tokens.accessToken },
                })
            } catch (error) {
                console.error('Login failed:', error)
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
                    select: authTokenUserSelect,
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
                const rotated = await this.refreshSessions.rotate(user.id, refreshToken, newRefreshToken, req)
                if (!rotated) {
                    clearRefreshTokenCookie(res)
                    return res.status(403).json({ error: 'Invalid or expired refresh token' })
                }
                setRefreshTokenCookie(res, newRefreshToken)

                res.json({
                    accessToken: newAccessToken,
                })
            } catch (error) {
                console.error('Refresh token rotation failed:', error)
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
                    select: authUserSelect,
                })

                if (!user) {
                    return res.status(401).json({ error: 'User no longer exists' })
                }

                res.json({
                    user: serializeAuthUser(user),
                })
            } catch (error) {
                console.error('Failed to fetch user in /me:', error)
                res.status(500).json({ error: 'Internal server error' })
            }
        })

        // Logout revokes the current refresh session and clears the browser cookie.
        router.post('/logout', async (req: Request, res: Response) => {
            try {
                const refreshToken = getRefreshTokenFromRequest(req)
                if (refreshToken) {
                    await this.refreshSessions.revoke(refreshToken)
                }
                clearRefreshTokenCookie(res)
                res.json({ success: true, message: 'Logged out successfully' })
            } catch (error) {
                console.error('Logout failed:', error)
                clearRefreshTokenCookie(res)
                res.status(500).json({ error: 'Logout failed' })
            }
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

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: authPasswordResetUserSelect,
                })

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
                    select: { id: true },
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
