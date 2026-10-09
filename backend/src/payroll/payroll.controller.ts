import express, { Request, Response, Router } from 'express'
import {
    PayrollConflictError,
    PayrollForbiddenError,
    PayrollNotFoundError,
    PayrollService,
    PayrollValidationError,
    UpdateTimeEntryDto,
} from './payroll.service'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'
import { config, isAdminEmail } from '../config/env.config'
import { periodBoundsFromInput } from './payroll.calculations'
import { prisma } from '../database/prisma.service'
import {
    canAccessPayrollTarget,
    canReviewTimeRequests,
    filterPayrollProfileUpdate,
    hasPayrollManagementAccess,
    PayrollAccess,
    PAYROLL_MANAGEMENT_ROUTE_ROLES as PAYROLL_ROUTE_ROLE_LIST,
} from './payroll.permissions'
import { createLogger } from '../observability/logger'
import { registerTimeRequestRoutes } from './time-requests.routes'
import { PayslipEditService } from './payslip-edit.service'
import { TimeRequestsService } from './time-requests.service'

const logger = createLogger('payroll.payroll.controller')


interface AuthRequest extends Request {
    user?: {
        userId: string
        email?: string
    }
}

// Shared list lives in payroll.permissions.ts (now includes payroll_finance, which
// org-access-policy already treated as payroll management).
const PAYROLL_MANAGEMENT_ROUTE_ROLES = [...PAYROLL_ROUTE_ROLE_LIST]
const DIRECT_ENTRY_EDIT_DENIED = 'Submit an adjustment request'

export class PayrollController {
    private service = new PayrollService()
    private payslipEdits = new PayslipEditService()
    private timeRequests = new TimeRequestsService()

    private getParam(value: string | string[]): string {
        return Array.isArray(value) ? value[0] : value
    }

    private async getPayrollAccess(req: Request): Promise<PayrollAccess | null> {
        const authReq = req as AuthRequest
        const requesterId = authReq.user?.userId
        if (!requesterId) return null

        const roles = await prisma.userRole.findMany({
            where: { userId: requesterId },
            select: { role: true },
        })

        const isConfiguredAdmin = isAdminEmail(authReq.user?.email)
        return {
            requesterId,
            isPrivileged: hasPayrollManagementAccess(roles, isConfiguredAdmin),
            canReviewTime: canReviewTimeRequests(roles, isConfiguredAdmin),
        }
    }

    private denyDirectEntryEdit(res: Response) {
        return res.status(403).json({ error: DIRECT_ENTRY_EDIT_DENIED, message: DIRECT_ENTRY_EDIT_DENIED })
    }

    /**
     * Reviewers without payroll access may not touch their own time (self-review rule):
     * they go through an adjustment request like everyone else.
     */
    private async isOwnEntryForNonPayroll(access: PayrollAccess, entryId: string): Promise<boolean> {
        if (access.isPrivileged) return false
        const entry = await prisma.timeEntry.findUnique({ where: { id: entryId }, select: { userId: true } })
        return entry?.userId === access.requesterId
    }

    private parseDate(value: unknown): Date | null {
        if (value === undefined || value === null || value === '') return null

        const date = new Date(String(value))
        return Number.isNaN(date.getTime()) ? null : date
    }

    private parseReportFilters(req: Request) {
        const firstValue = (value: unknown): string | undefined => {
            if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined
            return value === undefined || value === null || value === '' ? undefined : String(value)
        }

        return {
            userId: firstValue(req.query.userId),
            department: firstValue(req.query.department),
            status: firstValue(req.query.status),
        }
    }

    private sendPayrollError(res: Response, error: unknown, fallback: string) {
        if (error instanceof PayrollForbiddenError) {
            return res.status(403).json({ error: error.message })
        }
        if (error instanceof PayrollNotFoundError) {
            return res.status(404).json({ error: error.message })
        }
        if (error instanceof PayrollValidationError) {
            return res.status(400).json({ error: error.message })
        }
        if (error instanceof PayrollConflictError) {
            return res.status(409).json({ error: error.message })
        }
        if (error instanceof Error && (
            error.message === 'Invalid start time' ||
            error.message === 'Invalid end time' ||
            error.message === 'End time must be after start time' ||
            error.message === 'Invalid base salary' ||
            error.message === 'Invalid max billable hours per day'
        )) {
            return res.status(400).json({ error: error.message })
        }

        return res.status(500).json({ error: fallback })
    }

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
                logger.error('Error fetching events:', e)
                res.status(500).json({ error: 'Failed to fetch events' })
            }
        })

        router.post('/events', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
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
                logger.error('Error creating event:', e)
                res.status(500).json({ error: 'Failed to create event' })
            }
        })

        router.patch('/events/:id', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
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
                logger.error('Error updating event:', e)
                res.status(500).json({ error: 'Failed to update event' })
            }
        })

        router.delete('/events/:id', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                await this.service.deleteEvent(id)
                res.json({ message: 'Event deleted' })
            } catch (e) {
                logger.error('Error deleting event:', e)
                res.status(500).json({ error: 'Failed to delete event' })
            }
        })

        // TimeEntry endpoints
        router.get('/time-entries/active', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                const entry = await this.service.getActiveTimeEntry(access.requesterId)
                res.json(entry)
            } catch (e) {
                logger.error('Error fetching active time entry:', e)
                res.status(500).json({ error: 'Failed to fetch active entry' })
            }
        })

        router.get('/time-entries', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                let targetUserId = access.requesterId

                if (req.query.userId) {
                    const queriedUserId = req.query.userId as string
                    // Time reviewers (management or payroll roles) can read anyone's entries.
                    if (!canAccessPayrollTarget(access, queriedUserId) && !access.canReviewTime) {
                        return res.status(403).json({ error: 'Unauthorized to view another user\'s time entries' })
                    }
                    targetUserId = queriedUserId
                }

                const start = req.query.start ? new Date(req.query.start as string) : undefined
                const end = req.query.end ? new Date(req.query.end as string) : undefined

                const entries = await this.service.getTimeEntries(targetUserId, start, end)
                res.json(entries)
            } catch (e) {
                logger.error('Error fetching time entries:', e)
                res.status(500).json({ error: 'Failed to fetch entries' })
            }
        })


        router.post('/clock-in', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const entry = await this.service.clockIn(user.userId)
                res.json(entry)
                notificationService.broadcastDataChange('time-entries')
            } catch (e) {
                logger.error('Clock in error:', e)
                res.status(400).json({ error: e instanceof Error ? e.message : 'Clock in failed' })
            }
        })

        router.post('/clock-out', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const entry = await this.service.clockOut(user.userId)
                res.json(entry)
                notificationService.broadcastDataChange('time-entries')
            } catch (e) {
                logger.error('Clock out error:', e)
                res.status(400).json({ error: e instanceof Error ? e.message : 'Clock out failed' })
            }
        })

        router.post('/entry', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                if (!access.canReviewTime) return this.denyDirectEntryEdit(res)

                const { start, end, notes, userId } = req.body
                if (!start) return res.status(400).json({ error: 'Start time required' })

                const targetUserId = userId || access.requesterId
                if (targetUserId === access.requesterId && !access.isPrivileged) return this.denyDirectEntryEdit(res)

                const startDate = this.parseDate(start)
                const endDate = end ? this.parseDate(end) : null
                if (!startDate || (end && !endDate)) {
                    return res.status(400).json({ error: 'Invalid start or end time' })
                }

                const entry = await this.service.addManualEntry(
                    targetUserId,
                    startDate,
                    endDate,
                    notes
                )
                res.json(entry)
                notificationService.broadcastDataChange('time-entries')
            } catch (e) {
                logger.error('Error adding entry:', e)
                this.sendPayrollError(res, e, 'Failed')
            }
        })

        router.patch('/entry/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                if (!access.canReviewTime) return this.denyDirectEntryEdit(res)

                const id = this.getParam(req.params.id)
                const { start, end, notes, userId } = req.body
                if (userId !== undefined && !access.isPrivileged) {
                    return res.status(403).json({ error: 'Only payroll managers can move a time entry to another person' })
                }
                if (await this.isOwnEntryForNonPayroll(access, id)) return this.denyDirectEntryEdit(res)
                const updates: UpdateTimeEntryDto = {}

                if (start !== undefined) {
                    const startDate = this.parseDate(start)
                    if (!startDate) return res.status(400).json({ error: 'Invalid start time' })
                    updates.start = startDate
                }
                if (end !== undefined) {
                    if (end === null || end === '') {
                        updates.end = null
                    } else {
                        const endDate = this.parseDate(end)
                        if (!endDate) return res.status(400).json({ error: 'Invalid end time' })
                        updates.end = endDate
                    }
                }
                if (notes !== undefined) updates.notes = notes
                if (userId !== undefined) updates.userId = userId

                if (Object.keys(updates).length === 0) {
                    return res.status(400).json({ error: 'No time entry updates provided' })
                }

                const entry = await this.service.updateTimeEntry(id, updates, {
                    requesterId: access.requesterId,
                    canManageAny: true,
                })
                res.json(entry)
                notificationService.broadcastDataChange('time-entries')
            } catch (e) {
                logger.error('Error updating entry:', e)
                this.sendPayrollError(res, e, 'Failed to update entry')
            }
        })

        router.delete('/entry/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                if (!access.canReviewTime) return this.denyDirectEntryEdit(res)

                const id = this.getParam(req.params.id)
                if (await this.isOwnEntryForNonPayroll(access, id)) return this.denyDirectEntryEdit(res)
                await this.service.deleteTimeEntry(id, access.requesterId, {
                    canManageAny: true,
                })
                res.json({ success: true })
                notificationService.broadcastDataChange('time-entries')
            } catch (e) {
                logger.error('Error deleting entry:', e)
                this.sendPayrollError(res, e, 'Failed')
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

                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                if (!canAccessPayrollTarget(access, userId)) {
                    return res.status(403).json({ error: 'Forbidden' })
                }

                // Whole payroll-timezone days, whether the client sent YYYY-MM-DD or instants.
                const bounds = periodBoundsFromInput({ startDate, endDate }, config.payrollTimezone)
                const preview = await this.service.previewPayslip(userId, bounds.start, bounds.end)
                res.status(200).json(preview)
            } catch (e) {
                logger.error('Preview error:', e)
                this.sendPayrollError(res, e, 'Failed to preview calculation')
            }
        })

        // ==========================================
        // Payroll Processing Endpoints
        // ==========================================

        // Get Employee Profile (Self or Privileged Role)
        router.get('/config/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                const targetUserId = this.getParam(req.params.userId)

                if (!canAccessPayrollTarget(access, targetUserId)) {
                    return res.status(403).json({ error: 'Unauthorized to view another user\'s payroll profile' })
                }

                const profile = await this.service.getEmployeeProfile(targetUserId)
                res.json(profile)
            } catch (e) {
                logger.error('Error fetching payroll config:', e)
                res.status(500).json({ error: 'Failed to fetch profile' })
            }
        })

        // Update Employee Profile (Self or Privileged Role)
        router.post('/config/:userId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                const targetUserId = this.getParam(req.params.userId)

                if (!canAccessPayrollTarget(access, targetUserId)) {
                    return res.status(403).json({ error: 'Unauthorized to update another user\'s payroll profile' })
                }

                const filteredUpdate = filterPayrollProfileUpdate(req.body || {}, {
                    isPrivileged: access.isPrivileged,
                })
                if (filteredUpdate.rejectedFields.length > 0) {
                    return res.status(403).json({
                        error: 'Only payroll managers can update protected payroll profile fields',
                        fields: filteredUpdate.rejectedFields,
                    })
                }
                if (Object.keys(filteredUpdate.data).length === 0) {
                    return res.status(400).json({ error: 'No permitted payroll profile fields provided' })
                }

                const profile = await this.service.updateEmployeeProfile(targetUserId, filteredUpdate.data)
                res.json(profile)
            } catch (e) {
                logger.error('Error updating payroll config:', e)
                this.sendPayrollError(res, e, 'Failed to update profile')
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
        // Any authenticated user can trigger this (the service is idempotent)
        router.post('/periods/ensure', authenticateToken, async (req: Request, res: Response) => {
            try {
                const periodId = await this.service.ensureCurrentPeriodExists()
                res.json({ periodId })
            } catch (e) {
                logger.error('Error ensuring period:', e)
                res.status(500).json({ error: 'Failed to ensure period' })
            }
        })

        // Create Payroll Period (payroll management only)
        router.post('/periods', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
            try {
                const { startDate, endDate, payDate } = req.body || {}
                const bounds = periodBoundsFromInput({ startDate, endDate, payDate }, config.payrollTimezone)
                const period = await this.service.createPayrollPeriod(bounds)
                res.json(period)
            } catch (e) {
                this.sendPayrollError(res, e, 'Failed to create period')
            }
        })

        // Generate Payslip
        router.post(
            '/periods/:periodId/generate/:userId',
            authenticateToken,
            requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES),
            async (req: Request, res: Response) => {
                try {
                    const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId
                    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

                    // A hand-edited payslip answers 409 unless the caller confirms with force: true.
                    const payslip = await this.service.generatePayslip(periodId, userId, req.body, {
                        force: req.body?.force === true,
                    })
                    res.json(payslip)
                } catch (e) {
                    logger.error(e)
                    if (e instanceof PayrollConflictError || e instanceof PayrollValidationError) {
                        return this.sendPayrollError(res, e, 'Failed to generate payslip')
                    }
                    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to generate payslip' })
                }
            }
        )

        // Generate All Payslips for a Period
        router.post(
            '/periods/:periodId/generate-all',
            authenticateToken,
            requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES),
            async (req: Request, res: Response) => {
                try {
                    const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId
                    const results = await this.service.bulkGeneratePayslips(periodId)
                    res.json(results)
                } catch (e) {
                    logger.error(e)
                    res.status(500).json({ error: e instanceof Error ? e.message : 'Bulk generation failed' })
                }
            }
        )

        // Lock / Finalize a Payroll Period
        router.post(
            '/periods/:periodId/lock',
            authenticateToken,
            requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES),
            async (req: Request, res: Response) => {
                try {
                    const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId
                    const period = await this.service.lockPayrollPeriod(periodId)
                    res.json(period)
                } catch (e) {
                    logger.error(e)
                    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to lock period' })
                }
            }
        )

        // Get Payslips (own, or any user if admin/manager)
        router.get('/my-payslips', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                let targetUserId = access.requesterId

                const queriedUserId = req.query.userId as string | undefined
                if (queriedUserId) {
                    if (!canAccessPayrollTarget(access, queriedUserId)) {
                        return res.status(403).json({ error: 'Unauthorized to view another user\'s payslips' })
                    }
                    targetUserId = queriedUserId
                }

                const payslips = await this.service.getUserPayslips(targetUserId)
                res.json(payslips)
            } catch (e) {
                logger.error('Error fetching payslips:', e)
                res.status(500).json({ error: 'Failed to fetch payslips' })
            }
        })

        // Get Payroll Reports (payroll management only)
        router.get('/reports', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
            try {
                const stats = await this.service.getReportStats(this.parseReportFilters(req))
                res.json(stats)
            } catch (e) {
                logger.error('Error fetching report stats:', e)
                res.status(500).json({ error: 'Failed to fetch report stats' })
            }
        })

        // Get ALL payslips across all employees - Payslip Archive (payroll management only)
        router.get('/payslips/all', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
            try {
                const payslips = await this.service.getAllPayslips(this.parseReportFilters(req))
                res.json(payslips)
            } catch (e) {
                logger.error('Error fetching all payslips:', e)
                res.status(500).json({ error: 'Failed to fetch payslip archive' })
            }
        })

        // Edit a draft payslip: replace line items, recompute totals, record the editor (payroll v2)
        router.patch('/payslips/:id', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                // Payroll staff never edit their own payslip (the service refuses with 403).
                const payslip = await this.payslipEdits.editPayslip(this.getParam(req.params.id), access.requesterId, req.body || {})
                res.json(payslip)
                notificationService.broadcastDataChange('payslips')
            } catch (e) {
                logger.error('Error editing payslip:', e)
                this.sendPayrollError(res, e, 'Failed to edit payslip')
            }
        })

        router.delete('/payslips/:id', authenticateToken, requireRole(PAYROLL_MANAGEMENT_ROUTE_ROLES), async (req: Request, res: Response) => {
            try {
                const access = await this.getPayrollAccess(req)
                if (!access) return res.sendStatus(401)

                await this.payslipEdits.deletePayslip(this.getParam(req.params.id), access.requesterId)
                res.json({ success: true })
                notificationService.broadcastDataChange('payslips')
            } catch (e) {
                logger.error('Error deleting payslip:', e)
                this.sendPayrollError(res, e, 'Failed to delete payslip')
            }
        })

        registerTimeRequestRoutes(router, {
            service: this.timeRequests,
            getAccess: (req) => this.getPayrollAccess(req),
            sendError: (res, error, fallback) => this.sendPayrollError(res, error, fallback),
        })

        return router
    }
}

