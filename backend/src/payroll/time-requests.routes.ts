import { Request, Response, Router } from 'express'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'
import { createLogger } from '../observability/logger'
import { PayrollAccess, TIME_REVIEW_ROUTE_ROLES } from './payroll.permissions'
import { RequestListFilters, TimeRequestsService } from './time-requests.service'

const logger = createLogger('payroll.time-requests.routes')

export interface TimeRequestRouteDeps {
    getAccess: (req: Request) => Promise<PayrollAccess | null>
    sendError: (res: Response, error: unknown, fallback: string) => unknown
    service?: TimeRequestsService
}

type Kind = 'overtime' | 'adjustment'

function firstQueryValue(value: unknown): string | undefined {
    const first = Array.isArray(value) ? value[0] : value
    return first === undefined || first === null || first === '' ? undefined : String(first)
}

function parseListFilters(req: Request): RequestListFilters {
    return {
        status: firstQueryValue(req.query.status),
        userId: firstQueryValue(req.query.userId),
        from: firstQueryValue(req.query.from),
        to: firstQueryValue(req.query.to),
    }
}

function routeId(req: Request): string {
    const id = req.params.id
    return Array.isArray(id) ? id[0] : id
}

/**
 * Payroll v2 request routes, registered on the existing /payroll router:
 * /overtime-requests and /adjustment-requests (spec: docs/payroll-time-v2-spec.md).
 */
export function registerTimeRequestRoutes(router: Router, deps: TimeRequestRouteDeps): Router {
    const service = deps.service || new TimeRequestsService()
    const reviewGuard = requireRole([...TIME_REVIEW_ROUTE_ROLES])
    const basePath: Record<Kind, string> = {
        overtime: '/overtime-requests',
        adjustment: '/adjustment-requests',
    }
    const broadcast = () => notificationService.broadcastDataChange('time-entries')

    const withAccess = (
        fallback: string,
        handler: (req: Request, res: Response, access: PayrollAccess) => Promise<unknown>,
    ) => async (req: Request, res: Response) => {
        try {
            const access = await deps.getAccess(req)
            if (!access) return res.sendStatus(401)
            return await handler(req, res, access)
        } catch (error) {
            logger.error(fallback, error)
            return deps.sendError(res, error, fallback)
        }
    }

    const actorOf = (access: PayrollAccess) => ({
        requesterId: access.requesterId,
        canReview: access.canReviewTime === true,
    })

    // Create (self)
    router.post(basePath.overtime, authenticateToken, withAccess('Failed to create overtime request', async (req, res, access) => {
        const created = await service.createOvertimeRequest(access.requesterId, req.body || {})
        broadcast()
        return res.status(201).json(created)
    }))
    router.post(basePath.adjustment, authenticateToken, withAccess('Failed to create correction request', async (req, res, access) => {
        const created = await service.createAdjustmentRequest(access.requesterId, req.body || {})
        broadcast()
        return res.status(201).json(created)
    }))

    // List (self: own; reviewers: all)
    router.get(basePath.overtime, authenticateToken, withAccess('Failed to load overtime requests', async (req, res, access) => {
        return res.json(await service.listOvertimeRequests(parseListFilters(req), actorOf(access)))
    }))
    router.get(basePath.adjustment, authenticateToken, withAccess('Failed to load correction requests', async (req, res, access) => {
        return res.json(await service.listAdjustmentRequests(parseListFilters(req), actorOf(access)))
    }))

    // Review (management or payroll roles)
    router.post(`${basePath.overtime}/:id/approve`, authenticateToken, reviewGuard, withAccess('Failed to approve overtime request', async (req, res, access) => {
        const result = await service.reviewOvertimeRequest(routeId(req), access.requesterId, 'approved', req.body || {})
        broadcast()
        return res.json(result)
    }))
    router.post(`${basePath.overtime}/:id/reject`, authenticateToken, reviewGuard, withAccess('Failed to reject overtime request', async (req, res, access) => {
        const result = await service.reviewOvertimeRequest(routeId(req), access.requesterId, 'rejected', req.body || {})
        broadcast()
        return res.json(result)
    }))
    router.post(`${basePath.adjustment}/:id/approve`, authenticateToken, reviewGuard, withAccess('Failed to approve correction request', async (req, res, access) => {
        const result = await service.approveAdjustmentRequest(routeId(req), access.requesterId, req.body || {})
        broadcast()
        return res.json(result)
    }))
    router.post(`${basePath.adjustment}/:id/reject`, authenticateToken, reviewGuard, withAccess('Failed to reject correction request', async (req, res, access) => {
        const result = await service.rejectAdjustmentRequest(routeId(req), access.requesterId, req.body || {})
        broadcast()
        return res.json(result)
    }))

    // Withdraw (owner while pending, or reviewer)
    router.delete(`${basePath.overtime}/:id`, authenticateToken, withAccess('Failed to delete overtime request', async (req, res, access) => {
        await service.deleteOvertimeRequest(routeId(req), actorOf(access))
        broadcast()
        return res.json({ success: true })
    }))
    router.delete(`${basePath.adjustment}/:id`, authenticateToken, withAccess('Failed to delete correction request', async (req, res, access) => {
        await service.deleteAdjustmentRequest(routeId(req), actorOf(access))
        broadcast()
        return res.json({ success: true })
    }))

    return router
}
