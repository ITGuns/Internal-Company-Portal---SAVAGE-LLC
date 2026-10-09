import passport from 'passport'
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20'
import { config } from '../../config/env.config'
import { prisma } from '../../database/prisma.service'
import { createLogger } from '../../observability/logger'
import { authUserSelect } from '../auth.security'

const logger = createLogger('auth.google')

export function setupGoogleStrategy(): void {
    if (!config.googleClientId || !config.googleClientSecret) {
        logger.warn('Google OAuth not configured; skipping strategy')
        return
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: config.googleClientId,
                clientSecret: config.googleClientSecret,
                callbackURL: config.googleCallbackUrl || 'http://localhost:4000/auth/google/callback',
            },
            async (accessToken, refreshToken, profile: Profile, done) => {
                try {
                    // Extract user info from Google profile
                    const email = profile.emails?.[0]?.value
                    const name = profile.displayName
                    const avatar = profile.photos?.[0]?.value

                    if (!email) {
                        return done(new Error('No email found in Google profile'))
                    }

                    // Find or create user
                    let user = await prisma.user.findUnique({
                        where: { email },
                        select: authUserSelect,
                    })

                    if (!user) {
                        // OAuth-created users are auto-approved with free tier access.
                        user = await prisma.user.create({
                            data: {
                                email,
                                name,
                                avatar,
                                status: 'verified',
                                isApproved: true,
                                appliedDate: new Date(),
                            },
                            select: authUserSelect,
                        })
                        logger.info('New user created via Google OAuth (free tier)', { provider: 'google', email })
                    } else {
                        // Update existing user info
                        user = await prisma.user.update({
                            where: { email },
                            data: {
                                name,
                                avatar,
                            },
                            select: authUserSelect,
                        })
                    }

                    return done(null, user)
                } catch (error) {
                    logger.error('Google OAuth error', error)
                    return done(error as Error)
                }
            }
        )
    )

    logger.info('Google OAuth strategy configured')
}
