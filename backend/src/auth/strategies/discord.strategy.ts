import passport from 'passport'
import { Strategy as DiscordStrategy, Profile } from 'passport-discord'
import { config } from '../../config/env.config'
import { prisma } from '../../database/prisma.service'

export function setupDiscordStrategy(): void {
    if (!config.discordClientId || !config.discordClientSecret) {
        console.warn('⚠️  Discord OAuth not configured - skipping Discord strategy')
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
                        console.log(`✅ New user created via Discord OAuth: ${email}`)
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
                    console.error('Discord OAuth error:', error)
                    return done(error as Error)
                }
            }
        )
    )

    console.log('✅ Discord OAuth strategy configured')
}
