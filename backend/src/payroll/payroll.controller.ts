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

        // PayrollEvent endpoints
        router.get('/events', authenticateToken, async (req: Request, res: Response) => {
            try {
                const type = req.query.type as string | undefined
                const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
                const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

                const events = await this.service.getEvents(type, startDate, endDate)
                res.json(events)
            } catch (e) {
                console.error('Error fetching events:', e)
                res.status(500).json({ error: 'Failed to fetch events' })
            }
        })

        router.post('/events', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const { title, date, type, description, isBuiltIn } = req.body

                if (!title || !date || !type) {
                    return res.status(400).json({ error: 'Title, date, and type are required' })
                }

                const event = await this.service.createEvent({
                    title,
                    date,
                    type,
                    description,
                    createdBy: user?.userId,
                    isBuiltIn
                })

                res.status(201).json(event)
            } catch (e) {
                console.error('Error creating event:', e)
                res.status(500).json({ error: 'Failed to create event' })
            }
        })

        router.patch('/events/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { title, date, type, description } = req.body

                const event = await this.service.updateEvent(id, {
                    title,
                    date,
                    type,
                    description
                })

                res.json(event)
            } catch (e) {
                console.error('Error updating event:', e)
                res.status(500).json({ error: 'Failed to update event' })
            }
        })

        router.delete('/events/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                await this.service.deleteEvent(id)
                res.json({ message: 'Event deleted' })
            } catch (e) {
                console.error('Error deleting event:', e)
                res.status(500).json({ error: 'Failed to delete event' })
            }
        })

        // TimeEntry endpoints
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
                console.error('Error fetching time entries:', e)
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
                console.error('Clock in error:', e)
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
                console.error('Clock out error:', e)
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
                console.error('Error adding entry:', e)
                res.status(500).json({ error: 'Failed to add entry' })
            }
        })

        router.delete('/entry/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                await this.service.deleteTimeEntry(id, user.userId)
                res.json({ success: true })
            } catch (e) {
                console.error('Error deleting entry:', e)
                res.status(500).json({ error: 'Failed' })
            }
        })

        // ==========================================
        // Payroll Processing Endpoints
        // ==========================================

        // Get Employee Profile (Self or Admin)
        router.get('/config/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const user = (req as AuthRequest).user
                const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

                // Allow if self or admin
                // TODO: Add strict admin check
                if (user?.userId !== targetUserId) {
                    // Check role... pending requireRole usage
                }

                const profile = await this.service.getEmployeeProfile(targetUserId)
                res.json(profile)
            } catch (e) {
                res.status(500).json({ error: 'Failed to fetch profile' })
            }
        })

        // Update Employee Profile (Admin only ideally)
        router.post('/config/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
                const profile = await this.service.updateEmployeeProfile(targetUserId, req.body)
                res.json(profile)
            } catch (e) {
                console.error(e)
                res.status(500).json({ error: 'Failed to update profile' })
            }
        })

        // Get Payroll Periods
        router.get('/periods', authenticateToken, async (req: Request, res: Response) => {
            const periods = await this.service.getPayrollPeriods()
            res.json(periods)
        })

        // Create Payroll Period
        router.post('/periods', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { startDate, endDate, payDate } = req.body
                const period = await this.service.createPayrollPeriod(
                    new Date(startDate),
                    new Date(endDate),
                    new Date(payDate)
                )
                res.json(period)
            } catch (e) {
                res.status(500).json({ error: 'Failed to create period' })
            }
        })

        // Generate Payslip
        router.post('/periods/:periodId/generate/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId
                const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

                const payslip = await this.service.generatePayslip(periodId, userId)
                res.json(payslip)
            } catch (e: any) {
                console.error(e)
                res.status(500).json({ error: e.message || 'Failed to generate payslip' })
            }
        })

        // Get My Payslips
        router.get('/my-payslips', authenticateToken, async (req: Request, res: Response) => {
            // @ts-ignore
            const user = (req as AuthRequest).user
            if (!user) return res.sendStatus(401)

            const payslips = await this.service.getUserPayslips(user.userId)
            res.json(payslips)
        })

        return router
    }
}

