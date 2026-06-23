import type { Request, Response } from 'express'

export type OAuthStateProvider = 'google' | 'discord' | 'apple'

export function buildOAuthStateCookieName(provider: OAuthStateProvider): string {
    return `deskii_${provider}_oauth_state`
}

export function setOAuthStateCookie(res: Response, provider: OAuthStateProvider, state: string): void {
    res.cookie(buildOAuthStateCookieName(provider), state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: '/',
    })
}

export function clearOAuthStateCookie(res: Response, provider: OAuthStateProvider): void {
    res.clearCookie(buildOAuthStateCookieName(provider), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    })
}

function getCookieHeaderValue(cookieHeader: string | undefined, cookieName: string): string {
    if (!cookieHeader) return ''

    const cookieParts = cookieHeader.split(';')
    for (const part of cookieParts) {
        const [rawName, ...rawValueParts] = part.trim().split('=')
        if (rawName !== cookieName) continue

        try {
            return decodeURIComponent(rawValueParts.join('='))
        } catch {
            return rawValueParts.join('=')
        }
    }

    return ''
}

export function getOAuthStateFromRequest(req: Pick<Request, 'cookies' | 'headers'>, provider: OAuthStateProvider): string {
    const cookieName = buildOAuthStateCookieName(provider)
    const value = req.cookies?.[buildOAuthStateCookieName(provider)]
    if (typeof value === 'string') return value

    const cookieHeader = req.headers?.cookie
    return getCookieHeaderValue(typeof cookieHeader === 'string' ? cookieHeader : undefined, cookieName)
}

export function getOAuthCallbackState(req: Request): string {
    const state = req.query?.state
    return typeof state === 'string' ? state : ''
}
