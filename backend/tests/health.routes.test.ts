import assert from 'node:assert/strict'
import express from 'express'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHealthRouter } from '../src/health/health.routes'

async function requestStatus(router: express.Router, path: string): Promise<{ status: number; body: any }> {
  const app = express()
  app.use(router)
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`)
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

async function runHealthRouteTests() {
  const healthy = createHealthRouter({
    checkDatabase: async () => true,
    checkReadiness: async () => true,
  })
  assert.equal((await requestStatus(healthy, '/health')).status, 200)
  assert.equal((await requestStatus(healthy, '/ready')).status, 200)

  const unhealthy = createHealthRouter({
    checkDatabase: async () => false,
    checkReadiness: async () => false,
  })
  const health = await requestStatus(unhealthy, '/health')
  assert.equal(health.status, 503)
  assert.equal(health.body.status, 'unhealthy')

  const readiness = await requestStatus(unhealthy, '/ready')
  assert.equal(readiness.status, 503)
  assert.equal(readiness.body.status, 'not_ready')
}

runHealthRouteTests()
  .then(() => console.log('health.routes tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
