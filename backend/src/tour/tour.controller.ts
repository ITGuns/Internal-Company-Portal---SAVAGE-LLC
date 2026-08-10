// Guided-tour progress for the signed-in user.
//
// Deliberately tiny and self-contained: a set of string keys on the user saying
// which tours they have already been shown. Per account rather than per browser,
// so a client who signs in on their phone is not taught the portal a second time.
//
// Every route acts on the token's user - there is no userId in any path or body,
// so one person can neither read nor rewrite another's progress.

import express, { Request, Response, Router } from 'express'
import { authenticateToken, type AuthRequest } from '../auth/auth.middleware'
import { prisma } from '../database/prisma.service'
import { createLogger } from '../observability/logger'

const logger = createLogger('tour.controller')

/** Keys are code-defined, short, and dot-namespaced. Anything else is rejected. */
const KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z0-9-]+){1,3}$/
const MAX_KEYS = 100

export class TourController {
  router(): Router {
    const router = express.Router()

    router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = (req as AuthRequest).user?.userId
        if (!userId) return res.status(401).json({ error: 'Authentication required' })

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { tourSeen: true },
        })
        res.json({ seen: user?.tourSeen ?? [] })
      } catch (error) {
        logger.error('Error reading tour progress:', error)
        res.status(500).json({ error: 'Failed to read tour progress' })
      }
    })

    // Mark a tour finished or skipped. Idempotent - replaying it is a no-op, so a
    // double-click or a retry cannot duplicate entries.
    router.post('/:key/seen', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = (req as AuthRequest).user?.userId
        if (!userId) return res.status(401).json({ error: 'Authentication required' })

        const key = String(req.params.key || '').trim().toLowerCase()
        if (!KEY_PATTERN.test(key)) return res.status(400).json({ error: 'Invalid tour key' })

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { tourSeen: true },
        })
        if (!user) return res.status(404).json({ error: 'User not found' })

        if (user.tourSeen.includes(key)) return res.json({ ok: true, seen: user.tourSeen })
        // Bounded so a malformed client loop cannot grow the row without limit.
        if (user.tourSeen.length >= MAX_KEYS) return res.json({ ok: true, seen: user.tourSeen })

        const updated = await prisma.user.update({
          where: { id: userId },
          data: { tourSeen: { push: key } },
          select: { tourSeen: true },
        })
        res.json({ ok: true, seen: updated.tourSeen })
      } catch (error) {
        logger.error('Error recording tour progress:', error)
        res.status(500).json({ error: 'Failed to record tour progress' })
      }
    })

    // Replay everything. Lets someone re-run the guide from the checklist, and
    // lets support say "click this and walk through it again with me".
    router.delete('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = (req as AuthRequest).user?.userId
        if (!userId) return res.status(401).json({ error: 'Authentication required' })

        await prisma.user.update({ where: { id: userId }, data: { tourSeen: [] } })
        res.json({ ok: true, seen: [] })
      } catch (error) {
        logger.error('Error resetting tour progress:', error)
        res.status(500).json({ error: 'Failed to reset tour progress' })
      }
    })

    return router
  }
}
