import passport from 'passport'
import { Strategy as DiscordStrategy, Profile } from 'passport-discord'
import { config } from '../../config/env.config'
import { prisma } from '../../database/prisma.service'
import { createLogger } from '../../observability/logger'
import { authUserSelect } from '../auth.security'

const logger = createLogger('auth.discord')

export function setupDiscordStrategy(): void {
    if (!config.discordClientId || !config.discordClientSecret) {
        logger.warn('Discord OAuth not configured; skipping strategy')
        return
    }

    passport.use(
        new DiscordStrategy(
            {
                clientID: config.discordClientId,
                clientSecret: config.discordClientSecret,
                callbackURL: config.discordCallbackUrl || 'http://localhost:4000/auth/discord/callback',
                scope: ['identify', 'email'],
            },
            async (accessToken, refreshToken, profile: Profile, done) => {
                try {
                    // Extract user info from Discord profile
                    const email = profile.email
                    const name = profile.username
                    const avatar = profile.avatar
                        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                        : undefined

                    if (!email) {
                        return done(new Error('No email found in Discord profile'))
                    }

                    // Find or create user
                    let user = await prisma.user.findUnique({
                        where: { email },
                        select: authUserSelect,
                    })

                    if (!user) {
                        // OAuth-created users still require manager approval before login.
                        user = await prisma.user.create({
                            data: {
                                email,
                                name,
                                avatar,
                                status: 'pending',
                                isApproved: false,
                                appliedDate: new Date(),
                            },
                            select: authUserSelect,
                        })
                        logger.info('New user created via Discord OAuth', { provider: 'discord', email })
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
                    logger.error('Discord OAuth error', error)
                    return done(error as Error)
                }
            }
        )
    )

    logger.info('Discord OAuth strategy configured')
}
