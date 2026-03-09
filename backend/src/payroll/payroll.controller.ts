import express, { Request, Response, Router } from 'express'
import { PayrollService } from './payroll.service'
import { authenticateToken, requireRole, requireDepartment } from '../auth/auth.middleware'

interface AuthRequest extends Request {
    user?: {
        userId: string
        email?: string
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
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) return res.sendStatus(401)

                let targetUserId = requesterId

                // Allow admins/managers to query another user's entries via ?userId=
                if (req.query.userId && req.query.userId !== requesterId) {
                    // Check if requester is admin or manager
                    const { prisma } = await import('../database/prisma.service')
                    const requesterRoles = await prisma.userRole.findMany({ where: { userId: requesterId } })
                    const isPrivileged = requesterRoles.some(r => ['overlord', 'manager', 'operations_manager', 'operations manager'].includes(r.role.toLowerCase()))
                    const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(authReq.user?.email?.toLowerCase() || '')

                    if (!isPrivileged && !isAuthorizedEmail) {
                        return res.status(403).json({ error: 'Unauthorized to view another user\'s time entries' })
                    }
                    targetUserId = req.query.userId as string
                }

                const start = req.query.start ? new Date(req.query.start as string) : undefined
                const end = req.query.end ? new Date(req.query.end as string) : undefined

                const entries = await this.service.getTimeEntries(targetUserId, start, end)
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
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) return res.sendStatus(401)

                const { start, end, notes, userId } = req.body
                if (!start) return res.status(400).json({ error: 'Start time required' })

                let targetUserId = requesterId

                // Allow admins/managers to add entry for another user
                if (userId && userId !== requesterId) {
                    const { prisma } = await import('../database/prisma.service')
                    const requesterRoles = await prisma.userRole.findMany({ where: { userId: requesterId } })
                    const isPrivileged = requesterRoles.some(r => ['overlord', 'manager', 'operations manager', 'operations_manager'].includes(r.role.toLowerCase()))
                    const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(authReq.user?.email?.toLowerCase() || '')

                    if (!isPrivileged && !isAuthorizedEmail) {
                        return res.status(403).json({ error: 'Unauthorized to add manual entry for another user' })
                    }
                    targetUserId = userId
                }

                const entry = await this.service.addManualEntry(
                    targetUserId,
                    new Date(start),
                    end ? new Date(end) : null,
                    notes
                )
                res.json(entry)
            } catch (e) {
                console.error('Error adding entry:', e)
                res.status(500).json({ error: 'Failed' })
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

        // Preview Payslip Calculation
        router.get('/preview-calculation', authenticateToken, async (req: Request, res: Response) => {
            try {
                const userId = req.query.userId as string
                const startDate = req.query.startDate as string
                const endDate = req.query.endDate as string

                if (!userId || !startDate || !endDate) {
                    return res.status(400).json({ error: 'userId, startDate, and endDate are required' })
                }

                // Check permissions (self or admin/manager)
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                const { prisma } = await import('../database/prisma.service')
                const roles = await prisma.userRole.findMany({ where: { userId: requesterId } })
                const isPrivileged = roles.some(r =>
                    ['overlord', 'manager', 'operations manager', 'operations_manager'].includes(r.role.toLowerCase())
                )
                const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(authReq.user?.email?.toLowerCase() || '')

                if (requesterId !== userId && !isPrivileged && !isAuthorizedEmail) {
                    return res.status(403).json({ error: 'Forbidden' })
                }

                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                const preview = await this.service.previewPayslip(userId, new Date(startDate), end)
                res.status(200).json(preview)
            } catch (e: any) {
                console.error('Preview error:', e)
                res.status(500).json({ error: e.message || 'Failed to preview calculation' })
            }
        })

        // ==========================================
        // Payroll Processing Endpoints
        // ==========================================

        // Get Employee Profile (Self or Privileged Role)
        router.get('/config/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) return res.sendStatus(401)

                const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

                // Only allow self, or admin/manager
                if (requesterId !== targetUserId) {
                    const { prisma } = await import('../database/prisma.service')
                    const roles = await prisma.userRole.findMany({ where: { userId: requesterId } })
                    const isPrivileged = roles.some(r =>
                        ['overlord', 'manager', 'operations manager', 'operations_manager'].includes(r.role.toLowerCase())
                    )
                    const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(authReq.user?.email?.toLowerCase() || '')
                    if (!isPrivileged && !isAuthorizedEmail) {
                        return res.status(403).json({ error: 'Unauthorized to view another user\'s payroll profile' })
                    }
                }

                const profile = await this.service.getEmployeeProfile(targetUserId)
                res.json(profile)
            } catch (e) {
                console.error('Error fetching payroll config:', e)
                res.status(500).json({ error: 'Failed to fetch profile' })
            }
        })

        // Update Employee Profile (Self or Privileged Role)
        router.post('/config/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) return res.sendStatus(401)

                const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

                // Only allow self, or admin/manager
                if (requesterId !== targetUserId) {
                    const { prisma } = await import('../database/prisma.service')
                    const roles = await prisma.userRole.findMany({ where: { userId: requesterId } })
                    const isPrivileged = roles.some(r =>
                        ['overlord', 'manager', 'operations manager', 'operations_manager'].includes(r.role.toLowerCase())
                    )
                    const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(authReq.user?.email?.toLowerCase() || '')
                    if (!isPrivileged && !isAuthorizedEmail) {
                        return res.status(403).json({ error: 'Unauthorized to update another user\'s payroll profile' })
                    }
                }

                const profile = await this.service.updateEmployeeProfile(targetUserId, req.body)
                res.json(profile)
            } catch (e) {
                console.error('Error updating payroll config:', e)
                res.status(500).json({ error: 'Failed to update profile' })
            }
        })

        // Get Payroll Periods (accessible to all authenticated users so PayslipsTab can work)
        router.get('/periods', authenticateToken, async (req: Request, res: Response) => {
            try {
                const periods = await this.service.getPayrollPeriods()
                res.json(periods)
            } catch (e) {
                res.status(500).json({ error: 'Failed to fetch periods' })
            }
        })

        // Auto-ensure a current period exists (first-time / convenience setup)
        // Any authenticated user can trigger this — service is idempotent
        router.post('/periods/ensure', authenticateToken, async (req: Request, res: Response) => {
            try {
                const periodId = await this.service.ensureCurrentPeriodExists()
                res.json({ periodId })
            } catch (e) {
                console.error('Error ensuring period:', e)
                res.status(500).json({ error: 'Failed to ensure period' })
            }
        })

        // Create Payroll Period (Admin / Ops Manager only)
        router.post('/periods', authenticateToken, requireRole(['overlord', 'operations_manager']), async (req: Request, res: Response) => {
            try {
                const { startDate, endDate, payDate } = req.body
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                const period = await this.service.createPayrollPeriod(
                    new Date(startDate),
                    end,
                    new Date(payDate)
                )
                res.json(period)
            } catch (e) {
                res.status(500).json({ error: 'Failed to create period' })
            }
        })

        // Generate Payslip
        router.post(
            '/periods/:periodId/generate/:userId',
            authenticateToken,
            requireRole(['overlord', 'operations_manager']), // Restricted
            async (req: Request, res: Response) => {
                try {
                    const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId
                    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

                    const payslip = await this.service.generatePayslip(periodId, userId, req.body)
                    res.json(payslip)
                } catch (e: any) {
                    console.error(e)
                    res.status(500).json({ error: e.message || 'Failed to generate payslip' })
                }
            }
        )

        // Generate All Payslips for a Period
        router.post(
            '/periods/:periodId/generate-all',
            authenticateToken,
            requireRole(['overlord', 'operations_manager']),
            async (req: Request, res: Response) => {
                try {
                    const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId
                    const results = await this.service.bulkGeneratePayslips(periodId)
                    res.json(results)
                } catch (e: any) {
                    console.error(e)
                    res.status(500).json({ error: e.message || 'Bulk generation failed' })
                }
            }
        )

        // Get Payslips (own, or any user if admin/manager)
        router.get('/my-payslips', authenticateToken, async (req: Request, res: Response) => {
            try {
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) return res.sendStatus(401)

                let targetUserId = requesterId

                // Allow managers/admins to fetch another user's payslips via ?userId=
                const queriedUserId = req.query.userId as string | undefined
                if (queriedUserId && queriedUserId !== requesterId) {
                    const { prisma } = await import('../database/prisma.service')
                    const roles = await prisma.userRole.findMany({ where: { userId: requesterId } })
                    const isPrivileged = roles.some(r =>
                        ['overlord', 'manager', 'operations manager', 'operations_manager'].includes(r.role.toLowerCase())
                    )
                    const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(authReq.user?.email?.toLowerCase() || '')
                    if (!isPrivileged && !isAuthorizedEmail) {
                        return res.status(403).json({ error: 'Unauthorized to view another user\'s payslips' })
                    }
                    targetUserId = queriedUserId
                }

                const payslips = await this.service.getUserPayslips(targetUserId)
                res.json(payslips)
            } catch (e) {
                console.error('Error fetching payslips:', e)
                res.status(500).json({ error: 'Failed to fetch payslips' })
            }
        })

        // Get Payroll Reports (Admin / Ops Manager only)
        router.get('/reports', authenticateToken, requireRole(['overlord', 'operations_manager']), async (req: Request, res: Response) => {
            try {
                const stats = await this.service.getReportStats()
                res.json(stats)
            } catch (e) {
                console.error('Error fetching report stats:', e)
                res.status(500).json({ error: 'Failed to fetch report stats' })
            }
        })

        // Get ALL payslips across all employees - Payslip Archive (Admin / Ops Manager only)
        router.get('/payslips/all', authenticateToken, requireRole(['overlord', 'operations_manager']), async (req: Request, res: Response) => {
            try {
                const payslips = await this.service.getAllPayslips()
                res.json(payslips)
            } catch (e) {
                console.error('Error fetching all payslips:', e)
                res.status(500).json({ error: 'Failed to fetch payslip archive' })
            }
        })

        return router
    }
}

