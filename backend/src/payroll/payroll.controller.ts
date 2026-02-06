import express, { Request, Response, Router } from 'express'
import { PayrollService } from './payroll.service'
import { authenticateToken } from '../auth/auth.middleware'

interface AuthRequest extends Request {
    user?: {
        userId: string
    }
}

export class PayrollController {
    private service = new PayrollService()

    router(): Router {
        const router = express.Router()

        router.get('/events', authenticateToken, async (req: Request, res: Response) => {
            try {
                const events = await this.service.getEvents()
                res.json(events)
            } catch (e) {
                res.status(500).json({ error: 'Failed to fetch events' })
            }
        })

        router.get('/time-entries', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                // Optional date range
                const start = req.query.start ? new Date(req.query.start as string) : undefined
                const end = req.query.end ? new Date(req.query.end as string) : undefined

                const entries = await this.service.getTimeEntries(user.userId, start, end)
                res.json(entries)
            } catch (e) {
                res.status(500).json({ error: 'Failed to fetch entries' })
            }
        })

        router.post('/clock-in', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const entry = await this.service.clockIn(user.userId)
                res.json(entry)
            } catch (e: any) {
                res.status(400).json({ error: e.message || 'Clock in failed' })
            }
        })

        router.post('/clock-out', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const entry = await this.service.clockOut(user.userId)
                res.json(entry)
            } catch (e: any) {
                res.status(400).json({ error: e.message || 'Clock out failed' })
            }
        })

        router.post('/entry', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const { start, end, notes } = req.body
                if (!start) return res.status(400).json({ error: 'Start time required' })

                const entry = await this.service.addManualEntry(
                    user.userId,
                    new Date(start),
                    end ? new Date(end) : null,
                    notes
                )
                res.json(entry)
            } catch (e) {
                res.status(500).json({ error: 'Failed to add entry' })
            }
        })

        router.delete('/entry/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                await this.service.deleteTimeEntry(req.params.id, user.userId)
                res.json({ success: true })
            } catch (e) {
                res.status(500).json({ error: 'Failed' })
            }
        })

        return router
    }
}
