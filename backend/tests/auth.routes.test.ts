import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import bcrypt from 'bcrypt'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { AuthController } from '../src/auth/auth.controller'
import { JwtService } from '../src/auth/jwt.service'
import { REFRESH_TOKEN_COOKIE_NAME } from '../src/auth/auth.session'
import { config } from '../src/config/env.config'

type JsonRecord = Record<string, any>

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    body?: JsonRecord
    cookie?: string
  } = {},
): Promise<{ status: number; body: JsonRecord; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : {}

  return {
    status: response.status,
    body,
    headers: response.headers,
  }
}

async function requestRaw(
  baseUrl: string,
  path: string,
): Promise<{ status: number; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
  })

  return {
    status: response.status,
    headers: response.headers,
  }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/auth', new AuthController().router())

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.equal(typeof address, 'object')
  assert.ok(address)
  const port = (address as AddressInfo).port

  try {
    return await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

function getRefreshCookiePair(setCookieHeader: string): string {
  const cookiePair = setCookieHeader.split(';')[0]
  assert.match(cookiePair, new RegExp(`^${REFRESH_TOKEN_COOKIE_NAME}=`))
  return cookiePair
}

async function runAuthRouteTests() {
  const email = uniqueEmail('auth-route')
  const sandboxEmail = uniqueEmail('auth-sandbox-prod')
  const password = 'Password123'
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Auth Route User',
      password: passwordHash,
      status: 'active',
      isApproved: true,
      roles: {
        create: {
          role: 'employee',
        },
      },
    },
  })

  try {
    await withServer(async (baseUrl) => {
      const missingRefresh = await requestJson(baseUrl, '/auth/refresh', { method: 'POST' })
      assert.equal(missingRefresh.status, 400)

      const login = await requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      assert.equal(login.status, 200)
      assert.equal(typeof login.body.tokens.accessToken, 'string')
      assert.equal(Object.prototype.hasOwnProperty.call(login.body.tokens, 'refreshToken'), false)

      const loginCookie = login.headers.get('set-cookie') || ''
      assert.match(loginCookie, new RegExp(`${REFRESH_TOKEN_COOKIE_NAME}=`))
      assert.match(loginCookie, /HttpOnly/)
      assert.match(loginCookie, /SameSite=Strict/)

      const refreshCookiePair = getRefreshCookiePair(loginCookie)
      const cookieRefresh = await requestJson(baseUrl, '/auth/refresh', {
        method: 'POST',
        cookie: refreshCookiePair,
      })
      assert.equal(cookieRefresh.status, 200)
      assert.equal(typeof cookieRefresh.body.accessToken, 'string')
      const rotatedRefreshCookie = cookieRefresh.headers.get('set-cookie') || ''
      assert.match(rotatedRefreshCookie, new RegExp(`${REFRESH_TOKEN_COOKIE_NAME}=`))
      const rotatedRefreshCookiePair = getRefreshCookiePair(rotatedRefreshCookie)

      const reusedRefresh = await requestJson(baseUrl, '/auth/refresh', {
        method: 'POST',
        cookie: refreshCookiePair,
      })
      assert.equal(reusedRefresh.status, 403)

      const legacyRefreshToken = JwtService.generateRefreshToken({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
      })
      const bodyRefresh = await requestJson(baseUrl, '/auth/refresh', {
        method: 'POST',
        body: { refreshToken: legacyRefreshToken },
      })
      assert.equal(bodyRefresh.status, 400)

      const logout = await requestJson(baseUrl, '/auth/logout', {
        method: 'POST',
        cookie: rotatedRefreshCookiePair,
      })
      assert.equal(logout.status, 200)
      const logoutCookie = logout.headers.get('set-cookie') || ''
      assert.match(logoutCookie, new RegExp(`${REFRESH_TOKEN_COOKIE_NAME}=`))
      assert.match(logoutCookie, /Expires=Thu, 01 Jan 1970/)

      const revokedRefresh = await requestJson(baseUrl, '/auth/refresh', {
        method: 'POST',
        cookie: rotatedRefreshCookiePair,
      })
      assert.equal(revokedRefresh.status, 403)

      const previousNodeEnv = config.nodeEnv
      const previousGoogleClientId = config.googleClientId
      const previousGoogleClientSecret = config.googleClientSecret
      config.nodeEnv = 'production'
      config.googleClientId = undefined
      config.googleClientSecret = undefined
      try {
        const productionSandbox = await requestRaw(
          baseUrl,
          `/auth/sandbox?provider=google&email=${encodeURIComponent(sandboxEmail)}&name=Sandbox%20Prod`,
        )
        assert.equal(productionSandbox.status, 302)
        assert.match(productionSandbox.headers.get('location') || '', /oauthError=failed/)

        const createdSandboxUser = await prisma.user.findUnique({ where: { email: sandboxEmail } })
        assert.equal(createdSandboxUser, null)

        const productionGoogleStart = await requestRaw(baseUrl, '/auth/google')
        assert.equal(productionGoogleStart.status, 302)
        assert.match(productionGoogleStart.headers.get('location') || '', /oauthError=not_configured/)
      } finally {
        config.nodeEnv = previousNodeEnv
        config.googleClientId = previousGoogleClientId
        config.googleClientSecret = previousGoogleClientSecret
      }
    })
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: [email, sandboxEmail] } } })
  }
}

async function runMissingRefreshSessionMigrationFallbackTest() {
  const email = uniqueEmail('auth-route-missing-refresh-session')
  const password = 'Password123'
  const passwordHash = await bcrypt.hash(password, 10)
  const missingRefreshSessionTableError = {
    code: 'P2021',
    message: 'The table `public.RefreshSession` does not exist in the current database.',
    meta: { table: 'public.RefreshSession' },
  }
  const originalCreate = prisma.refreshSession.create
  const originalFindUnique = prisma.refreshSession.findUnique
  const originalUpdateMany = prisma.refreshSession.updateMany

  await prisma.user.create({
    data: {
      email,
      name: 'Auth Missing Migration User',
      password: passwordHash,
      status: 'active',
      isApproved: true,
      roles: {
        create: {
          role: 'employee',
        },
      },
    },
  })

  ;(prisma.refreshSession as any).create = async () => {
    throw missingRefreshSessionTableError
  }
  ;(prisma.refreshSession as any).findUnique = async () => {
    throw missingRefreshSessionTableError
  }
  ;(prisma.refreshSession as any).updateMany = async () => {
    throw missingRefreshSessionTableError
  }

  try {
    await withServer(async (baseUrl) => {
      const login = await requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      assert.equal(login.status, 200)
      assert.equal(typeof login.body.tokens.accessToken, 'string')

      const loginCookie = login.headers.get('set-cookie') || ''
      const refreshCookiePair = getRefreshCookiePair(loginCookie)
      const refresh = await requestJson(baseUrl, '/auth/refresh', {
        method: 'POST',
        cookie: refreshCookiePair,
      })
      assert.equal(refresh.status, 200)
      assert.equal(typeof refresh.body.accessToken, 'string')

      const logout = await requestJson(baseUrl, '/auth/logout', {
        method: 'POST',
        cookie: refreshCookiePair,
      })
      assert.equal(logout.status, 200)
    })
  } finally {
    ;(prisma.refreshSession as any).create = originalCreate
    ;(prisma.refreshSession as any).findUnique = originalFindUnique
    ;(prisma.refreshSession as any).updateMany = originalUpdateMany
    await prisma.user.deleteMany({ where: { email } })
  }
}

async function runAllAuthRouteTests() {
  await runAuthRouteTests()
  await runMissingRefreshSessionMigrationFallbackTest()
}

runAllAuthRouteTests()
  .then(() => {
    console.log('auth.routes tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
