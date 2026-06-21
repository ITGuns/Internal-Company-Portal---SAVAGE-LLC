import express, { Request, Response, Router } from 'express'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { SchedulerService } from './scheduler.service'
import { config } from '../config/env.config'
import { createLogger } from '../observability/logger'

const logger = createLogger('scheduler.controller')

const SCHEDULER_MANAGEMENT_ROLES = [
    'admin',
    'administrator',
    'operations_manager',
    'bookkeeper',
    'bookkeeping',
    'financial_controller',
]

/**
 * Middleware: verify the Vercel Cron / scheduler secret header.
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET>; SCHEDULER_SECRET remains a legacy fallback.
 */
function requireSchedulerSecret(req: Request, res: Response, next: express.NextFunction) {
    const secret = config.schedulerSecret

    // If no secret is configured, allow in non-production (dev convenience)
    if (!secret) {
        if (config.nodeEnv === 'production') {
            return res.status(500).json({ error: 'CRON_SECRET or SCHEDULER_SECRET not configured' })
        }
        return next()
    }

    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token || token !== secret) {
        logger.warn('Scheduler cron request rejected - invalid secret')
        return res.status(401).json({ error: 'Unauthorized' })
    }

    next()
}

export class SchedulerController {
    private service = new SchedulerService()

    router(): Router {
        const router = express.Router()

        const handleCronRun = async (_req: Request, res: Response) => {
            const triggeredBy = 'cron'
            logger.info('Scheduler cron triggered', { triggeredBy })

            try {
                const results = await this.service.runAll(triggeredBy)
                res.json({ ok: true, results })
            } catch (err) {
                logger.error('Cron run failed', { error: err })
                res.status(500).json({ ok: false, error: 'Cron run failed' })
            }
        }

        // Vercel Cron calls this endpoint with GET. Keep POST for manual/local compatibility.
        // Protected by CRON_SECRET/SCHEDULER_SECRET bearer token.
        router.get('/cron', requireSchedulerSecret, handleCronRun)
        router.post('/cron', requireSchedulerSecret, handleCronRun)

        // ── Manual trigger (admin UI) ──────────────────────────────────────
        // Protected by JWT + admin/operations_manager role
        router.post(
            '/run/:jobType',
            authenticateToken,
            requireRole(SCHEDULER_MANAGEMENT_ROLES),
            async (req: Request, res: Response) => {
                const { jobType } = req.params
                logger.info('Scheduler manual run triggered', { jobType })

                try {
                    let result
                    if (jobType === 'period-advance') {
                        result = await this.service.runPeriodAdvance('manual')
                    } else if (jobType === 'auto-payslip') {
                        result = await this.service.runAutoPayslip('manual')
                    } else if (jobType === 'dept-report') {
                        result = await this.service.runDeptReport('manual')
                    } else if (jobType === 'client-invoices') {
                        result = await this.service.runClientInvoices('manual')
                    } else if (jobType === 'all') {
                        result = await this.service.runAll('manual')
                    } else {
                        return res.status(400).json({ error: `Unknown job type: ${jobType}` })
                    }
                    res.json({ ok: true, result })
                } catch (err) {
                    logger.error('Manual run failed', { jobType, error: err })
                    res.status(500).json({ ok: false, error: 'Job run failed' })
                }
            },
        )

        // ── Job run history (admin UI) ─────────────────────────────────────
        router.get(
            '/runs',
            authenticateToken,
            requireRole(SCHEDULER_MANAGEMENT_ROLES),
            async (req: Request, res: Response) => {
                try {
                    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100)
                    const runs = await this.service.getRecentRuns(limit)
                    res.json(runs)
                } catch (err) {
                    logger.error('Failed to fetch job runs', { error: err })
                    res.status(500).json({ error: 'Failed to fetch job runs' })
                }
            },
        )

        return router
    }
}
