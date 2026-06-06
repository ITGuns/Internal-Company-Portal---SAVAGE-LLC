import passport from 'passport'
import { setupGoogleStrategy } from './strategies/google.strategy'
import { setupDiscordStrategy } from './strategies/discord.strategy'

/**
 * Initialize Passport and configure OAuth strategies
 */
export function initializePassport(): void {
    // Setup OAuth strategies
    setupGoogleStrategy()
    setupDiscordStrategy()

    // Serialize user (not used with JWT, but required by Passport)
    passport.serializeUser((user: { id: string }, done) => {
        done(null, user.id)
    })

    // Deserialize user (not used with JWT, but required by Passport)
    passport.deserializeUser((id: string, done) => {
        done(null, { id })
    })

    console.log('✅ Passport initialized')
}
