import { Request, Response, Router } from 'express'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'
import { createLogger } from '../observability/logger'
import { PayrollAccess, PAYROLL_MANAGEMENT_ROUTE_ROLES } from './payroll.permissions'
import { PayslipApprovalService, payslipApprovalService, SIGNER_ONLY_MESSAGE } from './payslip-approval.service'

const logger = createLogger('payroll.approval.routes')

export interface PayslipApprovalRouteDeps {
    getAccess: (req: Request) => Promise<PayrollAccess | null>
    sendError: (res: Response, error: unknown, fallback: string) => unknown
    service?: PayslipApprovalService
}

function param(req: Request, name: string): string {
    const value = req.params[name]
    return Array.isArray(value) ? value[0] : value
}

/**
 * Disbursement sign-off (2026-10-28), registered on the /payroll router.
 * Approve, revoke and approve-all: a Disbursement Officer or a full-access
 * account (403 for everyone else, payroll managers included). The period
 * summary: payroll-management roles. Contract: docs/api.md, "Payslip approval".
 */
export function registerPayslipApprovalRoutes(router: Router, deps: PayslipApprovalRouteDeps): Router {
    const service = deps.service || payslipApprovalService
    const broadcast = () => notificationService.broadcastDataChange('payslips')

    const handle = (
        fallback: string,
        options: { signerOnly: boolean },
        handler: (req: Request, res: Response, access: PayrollAccess) => Promise<unknown>,
    ) => async (req: Request, res: Response) => {
        try {
            const access = await deps.getAccess(req)
            if (!access) return res.sendStatus(401)
            if (options.signerOnly && !access.canSignDisbursement) {
                return res.status(403).json({ error: SIGNER_ONLY_MESSAGE })
            }
            return await handler(req, res, access)
        } catch (error) {
            logger.error(fallback, error)
            return deps.sendError(res, error, fallback)
        }
    }

    router.post('/payslips/:id/approve', authenticateToken, handle('Failed to approve the payslip', { signerOnly: true }, async (req, res, access) => {
        const payslip = await service.approvePayslip(param(req, 'id'), access.requesterId, req.body || {})
        broadcast()
        return res.json(payslip)
    }))

    router.post('/payslips/:id/revoke-approval', authenticateToken, handle('Failed to revoke the approval', { signerOnly: true }, async (req, res, access) => {
        const payslip = await service.revokeApproval(param(req, 'id'), access.requesterId)
        broadcast()
        return res.json(payslip)
    }))

    router.post('/periods/:periodId/approve-all', authenticateToken, handle('Failed to approve the payslips', { signerOnly: true }, async (req, res, access) => {
        const result = await service.approveAll(param(req, 'periodId'), access.requesterId, req.body || {})
        if (result.approved > 0) broadcast()
        return res.json(result)
    }))

    router.get(
        '/periods/:periodId/approval-summary',
        authenticateToken,
        requireRole([...PAYROLL_MANAGEMENT_ROUTE_ROLES]),
        handle('Failed to load the approval summary', { signerOnly: false }, async (req, res, access) => {
            return res.json(await service.periodSummary(param(req, 'periodId'), access.requesterId))
        }),
    )

    return router
}
