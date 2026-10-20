import { Request, Response, Router } from 'express'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'
import { createLogger } from '../observability/logger'
import { PayrollNotFoundError } from './payroll.errors'
import { PayrollAccess, PAYROLL_MANAGEMENT_ROUTE_ROLES } from './payroll.permissions'
import { isPayrollOptionCategory, PayrollOptionCategory } from './payroll-options.validation'
import { PayrollOptionsService, payrollOptionsService } from './payroll-options.service'

const logger = createLogger('payroll.options.routes')

/** Socket resource; the frontend invalidates React Query keys starting with it. */
export const PAYROLL_OPTIONS_RESOURCE = 'payroll-options'

export interface PayrollOptionRouteDeps {
    getAccess: (req: Request) => Promise<PayrollAccess | null>
    sendError: (res: Response, error: unknown, fallback: string) => unknown
    service?: PayrollOptionsService
}

function param(req: Request, name: string): string {
    const value = req.params[name]
    return Array.isArray(value) ? value[0] : value
}

function categoryOf(req: Request): PayrollOptionCategory {
    const category = param(req, 'category')
    if (!isPayrollOptionCategory(category)) throw new PayrollNotFoundError('Unknown option list')
    return category
}

/**
 * Managed payroll lists (2026-10-20), registered on the /payroll router:
 * /schemes and /options/:category (employment_type | payment_frequency).
 * Reads: any signed-in user (pages show scheme names and labels); usage counts
 * only for payroll roles. Writes: PAYROLL_MANAGEMENT_ROUTE_ROLES.
 */
export function registerPayrollOptionRoutes(router: Router, deps: PayrollOptionRouteDeps): Router {
    const service = deps.service || payrollOptionsService
    const manage = requireRole([...PAYROLL_MANAGEMENT_ROUTE_ROLES])
    const broadcast = () => notificationService.broadcastDataChange(PAYROLL_OPTIONS_RESOURCE)

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

    router.get('/schemes', authenticateToken, withAccess('Failed to load payroll schemes', async (_req, res, access) => {
        return res.json(await service.listSchemes({ includeUsage: access.isPrivileged }))
    }))
    router.post('/schemes', authenticateToken, manage, withAccess('Failed to add the scheme', async (req, res) => {
        const created = await service.createScheme(req.body || {})
        broadcast()
        return res.status(201).json(created)
    }))
    router.patch('/schemes/:id', authenticateToken, manage, withAccess('Failed to update the scheme', async (req, res) => {
        const updated = await service.updateScheme(param(req, 'id'), req.body || {})
        broadcast()
        return res.json(updated)
    }))
    router.delete('/schemes/:id', authenticateToken, manage, withAccess('Failed to delete the scheme', async (req, res) => {
        await service.deleteScheme(param(req, 'id'))
        broadcast()
        return res.json({ success: true })
    }))

    router.get('/options/:category', authenticateToken, withAccess('Failed to load the option list', async (req, res, access) => {
        return res.json(await service.listOptions(categoryOf(req), { includeUsage: access.isPrivileged }))
    }))
    router.post('/options/:category', authenticateToken, manage, withAccess('Failed to add the option', async (req, res) => {
        const created = await service.createOption(categoryOf(req), req.body || {})
        broadcast()
        return res.status(201).json(created)
    }))
    router.patch('/options/:category/:id', authenticateToken, manage, withAccess('Failed to update the option', async (req, res) => {
        const updated = await service.updateOption(categoryOf(req), param(req, 'id'), req.body || {})
        broadcast()
        return res.json(updated)
    }))
    router.delete('/options/:category/:id', authenticateToken, manage, withAccess('Failed to delete the option', async (req, res) => {
        await service.deleteOption(categoryOf(req), param(req, 'id'))
        broadcast()
        return res.json({ success: true })
    }))

    return router
}
