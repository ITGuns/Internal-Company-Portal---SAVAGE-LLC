import crypto from 'node:crypto'
import type { Request } from 'express'
import { prisma } from '../database/prisma.service'
import { config } from '../config/env.config'

const DEFAULT_REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000

function parseDurationMs(value: string): number | undefined {
  const match = value.trim().match(/^(\d+)([smhd])?$/i)
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

function getClientIp(req?: Request): string | undefined {
  const forwardedFor = req?.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || undefined
  }
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim() || undefined
  }
  return req?.ip
}

export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash('sha256').update(refreshToken).digest('hex')
}

export function getRefreshSessionExpiresAt(): Date {
  const durationMs = parseDurationMs(config.refreshTokenExpiresIn) || DEFAULT_REFRESH_TOKEN_EXPIRES_MS
  return new Date(Date.now() + durationMs)
}

export class RefreshSessionService {
  async create(userId: string, refreshToken: string, req?: Request) {
    return prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: getRefreshSessionExpiresAt(),
        userAgent: typeof req?.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
        ipAddress: getClientIp(req),
      },
    })
  }

  async rotate(
    userId: string,
    currentRefreshToken: string,
    nextRefreshToken: string,
    req?: Request,
  ): Promise<boolean> {
    const now = new Date()
    const currentTokenHash = hashRefreshToken(currentRefreshToken)
    const nextTokenHash = hashRefreshToken(nextRefreshToken)
    const existing = await prisma.refreshSession.findUnique({
      where: { tokenHash: currentTokenHash },
    })

    if (!existing || existing.userId !== userId) return false

    if (existing.revokedAt || existing.expiresAt <= now) {
      if (existing.replacedByTokenHash) {
        await prisma.refreshSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        })
      }
      return false
    }

    await prisma.$transaction([
      prisma.refreshSession.update({
        where: { id: existing.id },
        data: {
          revokedAt: now,
          replacedByTokenHash: nextTokenHash,
        },
      }),
      prisma.refreshSession.create({
        data: {
          userId,
          tokenHash: nextTokenHash,
          expiresAt: getRefreshSessionExpiresAt(),
          userAgent: typeof req?.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
          ipAddress: getClientIp(req),
        },
      }),
    ])

    return true
  }

  async revoke(refreshToken: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
  }
}
