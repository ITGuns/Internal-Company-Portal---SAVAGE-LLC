import jwt from 'jsonwebtoken'
import { config } from '../config/env.config'

export interface JwtPayload {
    userId: string
    email: string
    name?: string
}

export class JwtService {
    /**
     * Generate access token (short-lived)
     */
    static generateAccessToken(payload: JwtPayload): string {
        return jwt.sign(payload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn as any,
        })
    }

    /**
     * Generate refresh token (long-lived)
     */
    static generateRefreshToken(payload: JwtPayload): string {
        return jwt.sign(payload, config.refreshTokenSecret, {
            expiresIn: config.refreshTokenExpiresIn as any,
        })
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, config.jwtSecret) as JwtPayload
        } catch (error) {
            throw new Error('Invalid or expired access token')
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, config.refreshTokenSecret) as JwtPayload
        } catch (error) {
            throw new Error('Invalid or expired refresh token')
        }
    }

    /**
     * Generate both access and refresh tokens
     */
    static generateTokenPair(payload: JwtPayload): {
        accessToken: string
        refreshToken: string
    } {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
        }
    }
}
