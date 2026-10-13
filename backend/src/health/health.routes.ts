import express, { type Router } from 'express'
import { createLogger } from '../observability/logger'

const logger = createLogger('health.routes')

export interface HealthDependencies {
    checkDatabase: () => Promise<boolean>
    checkReadiness: () => Promise<boolean>
}

async function runCheck(check: () => Promise<boolean>, name = 'check'): Promise<boolean> {
    try {
        const ok = await check()
        if (!ok) logger.warn(`Health ${name} reported not ok`)
        return ok
    } catch (error) {
        logger.warn(`Health ${name} threw`, error)
        return false
    }
}

export function createHealthRouter(dependencies: HealthDependencies): Router {
    const router = express.Router()

    router.get('/health', async (_req, res) => {
        const databaseHealthy = await runCheck(dependencies.checkDatabase, 'database')
        res.status(databaseHealthy ? 200 : 503).json({
            // ok: the shape the Gemfield control panel's "Database health" probe expects.
            ok: databaseHealthy,
            status: databaseHealthy ? 'healthy' : 'unhealthy',
            database: databaseHealthy ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
        })
    })

    router.get('/ready', async (_req, res) => {
        const ready = await runCheck(dependencies.checkReadiness, 'readiness')
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
        })
    })

    return router
}
