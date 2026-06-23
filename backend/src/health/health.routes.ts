import express, { type Router } from 'express'

export interface HealthDependencies {
    checkDatabase: () => Promise<boolean>
    checkReadiness: () => Promise<boolean>
}

async function runCheck(check: () => Promise<boolean>): Promise<boolean> {
    try {
        return await check()
    } catch {
        return false
    }
}

export function createHealthRouter(dependencies: HealthDependencies): Router {
    const router = express.Router()

    router.get('/health', async (_req, res) => {
        const databaseHealthy = await runCheck(dependencies.checkDatabase)
        res.status(databaseHealthy ? 200 : 503).json({
            status: databaseHealthy ? 'healthy' : 'unhealthy',
            database: databaseHealthy ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
        })
    })

    router.get('/ready', async (_req, res) => {
        const ready = await runCheck(dependencies.checkReadiness)
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
        })
    })

    return router
}
