import passport from 'passport'
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20'
import { config } from '../../config/env.config'
import { prisma } from '../../database/prisma.service'

export function setupGoogleStrategy(): void {
    if (!config.googleClientId || !config.googleClientSecret) {
        console.warn('⚠️  Google OAuth not configured - skipping Google strategy')
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
                    })

                    if (!user) {
                        // Create new user
                        user = await prisma.user.create({
                            data: {
                                email,
                                name,
                                avatar,
                            },
                        })
                        console.log(`✅ New user created via Google OAuth: ${email}`)
                    } else {
                        // Update existing user info
                        user = await prisma.user.update({
                            where: { email },
                            data: {
                                name,
                                avatar,
                            },
                        })
                    }

                    return done(null, user)
                } catch (error) {
                    console.error('Google OAuth error:', error)
                    return done(error as Error)
                }
            }
        )
    )

    console.log('✅ Google OAuth strategy configured')
}
