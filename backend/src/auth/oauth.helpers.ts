import crypto from 'crypto'
import type { Request, Response } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { config } from '../config/env.config'
import { prisma } from '../database/prisma.service'
import { authUserSelect, type AuthUserLike } from './auth.security'

export type OAuthProvider = 'google' | 'discord' | 'apple'

const APPLE_AUTHORIZATION_URL = 'https://appleid.apple.com/auth/authorize'
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token'
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
const APPLE_ISSUER = 'https://appleid.apple.com'
const APPLE_AUDIENCE = 'https://appleid.apple.com'
const APPLE_STATE_COOKIE = 'deskii_apple_oauth_state'
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000

type AppleTokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  token_type?: string
  error?: string
  error_description?: string
}

type AppleJwtHeader = {
  kid?: string
  alg?: string
}

type AppleIdentityPayload = JwtPayload & {
  sub?: string
  email?: string
  email_verified?: boolean | string
  is_private_email?: boolean | string
}

type AppleUserPayload = {
  name?: {
    firstName?: string
    lastName?: string
  }
  email?: string
}

type AppleJwk = crypto.webcrypto.JsonWebKey & {
  kid?: string
  alg?: string
}

let cachedAppleKeys: { keys: AppleJwk[]; expiresAt: number } | null = null

export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000'
}

export function buildOAuthFrontendRedirect(
  provider: OAuthProvider,
  status: 'success' | 'pending' | 'failed' | 'not_configured' | 'state_mismatch' = 'success',
): string {
  const redirectUrl = new URL(status === 'success' ? '/auth/callback' : '/login', getFrontendUrl())
  redirectUrl.searchParams.set('provider', provider)
  if (status !== 'success') {
    redirectUrl.searchParams.set('oauthError', status)
  }
  return redirectUrl.toString()
}

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString('hex')
}

export function setAppleOAuthStateCookie(res: Response, state: string): void {
  res.cookie(APPLE_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: '/',
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
  })
}

export function clearAppleOAuthStateCookie(res: Response): void {
  res.clearCookie(APPLE_STATE_COOKIE, {
    path: '/',
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
  })
}

export function getAppleOAuthStateFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${APPLE_STATE_COOKIE}=`))

  if (!cookie) return null
  return decodeURIComponent(cookie.slice(APPLE_STATE_COOKIE.length + 1))
}

export function isAppleOAuthConfigured(): boolean {
  return Boolean(
    config.appleClientId &&
    config.appleTeamId &&
    config.appleKeyId &&
    config.applePrivateKey,
  )
}

export function getAppleCallbackUrl(): string {
  return config.appleCallbackUrl || 'http://localhost:4000/auth/apple/callback'
}

export function buildAppleAuthorizationUrl(state: string): string {
  if (!config.appleClientId) {
    throw new Error('Apple OAuth client ID is not configured')
  }

  const authorizationUrl = new URL(APPLE_AUTHORIZATION_URL)
  authorizationUrl.searchParams.set('client_id', config.appleClientId)
  authorizationUrl.searchParams.set('redirect_uri', getAppleCallbackUrl())
  authorizationUrl.searchParams.set('response_type', 'code id_token')
  authorizationUrl.searchParams.set('response_mode', 'form_post')
  authorizationUrl.searchParams.set('scope', 'name email')
  authorizationUrl.searchParams.set('state', state)
  authorizationUrl.searchParams.set('nonce', createOAuthState())
  return authorizationUrl.toString()
}

export function createAppleClientSecret(now = Math.floor(Date.now() / 1000)): string {
  if (!isAppleOAuthConfigured()) {
    throw new Error('Apple OAuth is not configured')
  }

  const privateKey = String(config.applePrivateKey).replace(/\\n/g, '\n')
  return jwt.sign(
    {
      iat: now,
    },
    privateKey,
    {
      algorithm: 'ES256',
      audience: APPLE_AUDIENCE,
      expiresIn: '180d',
      issuer: config.appleTeamId,
      keyid: config.appleKeyId,
      subject: config.appleClientId,
    },
  )
}

export function parseAppleUserName(rawUser: unknown): string | undefined {
  if (typeof rawUser !== 'string' || !rawUser.trim()) return undefined

  try {
    const parsed = JSON.parse(rawUser) as AppleUserPayload
    const firstName = parsed.name?.firstName?.trim()
    const lastName = parsed.name?.lastName?.trim()
    const name = [firstName, lastName].filter(Boolean).join(' ').trim()
    return name || undefined
  } catch {
    return undefined
  }
}

export async function exchangeAppleAuthorizationCode(code: string): Promise<AppleTokenResponse> {
  const body = new URLSearchParams({
    client_id: String(config.appleClientId),
    client_secret: createAppleClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: getAppleCallbackUrl(),
  })

  const response = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json().catch(() => ({})) as AppleTokenResponse
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || 'Apple token exchange failed')
  }
  if (!payload.id_token) {
    throw new Error('Apple identity token missing')
  }

  return payload
}

async function getApplePublicKeys(): Promise<AppleJwk[]> {
  if (cachedAppleKeys && cachedAppleKeys.expiresAt > Date.now()) {
    return cachedAppleKeys.keys
  }

  const response = await fetch(APPLE_KEYS_URL)
  if (!response.ok) {
    throw new Error('Unable to load Apple public keys')
  }

  const payload = await response.json().catch(() => null) as { keys?: AppleJwk[] } | null
  const keys = payload?.keys || []
  cachedAppleKeys = {
    keys,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }
  return keys
}

export async function verifyAppleIdentityToken(idToken: string): Promise<AppleIdentityPayload> {
  if (!config.appleClientId) {
    throw new Error('Apple OAuth client ID is not configured')
  }

  const decoded = jwt.decode(idToken, { complete: true }) as { header?: AppleJwtHeader } | null
  const kid = decoded?.header?.kid
  if (!kid) {
    throw new Error('Apple identity token key ID missing')
  }

  const keys = await getApplePublicKeys()
  const jwk = keys.find((key) => key.kid === kid)
  if (!jwk) {
    throw new Error('Apple identity token key not found')
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: config.appleClientId,
    issuer: APPLE_ISSUER,
  }) as AppleIdentityPayload

  if (!payload.email) {
    throw new Error('Apple account email missing')
  }

  return payload
}

export async function findOrCreateAppleOAuthUser(
  profile: { email: string; name?: string },
): Promise<AuthUserLike> {
  const email = profile.email.trim().toLowerCase()
  const fallbackName = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || email

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: authUserSelect,
  })

  if (existingUser) {
    return prisma.user.update({
      where: { email },
      data: {
        ...(profile.name ? { name: profile.name } : {}),
      },
      select: authUserSelect,
    })
  }

  return prisma.user.create({
    data: {
      email,
      name: profile.name || fallbackName,
      status: 'pending',
      isApproved: false,
      appliedDate: new Date(),
    },
    select: authUserSelect,
  })
}
