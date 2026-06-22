import type { CookieOptions, Request, Response } from 'express'
import { config } from '../config/env.config'

export const REFRESH_TOKEN_COOKIE_NAME = 'portal_refresh_token'

function parseDurationMs(value: string): number | undefined {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d+)([smhd])?$/i)
  if (!match) return undefined

  const amount = Number.parseInt(match[1], 10)
  if (!Number.isFinite(amount) || amount < 1) return undefined

  const unit = (match[2] || 's').toLowerCase()
  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit]

  return multiplier ? amount * multiplier : undefined
}

function getRefreshCookieOptions(): CookieOptions {
  const maxAge = parseDurationMs(config.refreshTokenExpiresIn)

  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  }
}

function readCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined

  for (const cookiePart of cookieHeader.split(';')) {
    const [rawName, ...rawValueParts] = cookiePart.trim().split('=')
    if (rawName !== name) continue

    const rawValue = rawValueParts.join('=')
    if (!rawValue) return undefined

    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }

  return undefined
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

export function clearRefreshTokenCookie(res: Response): void {
  const { maxAge: _maxAge, ...clearOptions } = getRefreshCookieOptions()
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, clearOptions)
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const cookieToken = typeof req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] === 'string'
    ? req.cookies[REFRESH_TOKEN_COOKIE_NAME]
    : readCookieValue(req.headers.cookie, REFRESH_TOKEN_COOKIE_NAME)

  return cookieToken || undefined
}
