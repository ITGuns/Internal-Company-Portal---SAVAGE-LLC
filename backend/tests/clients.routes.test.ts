import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { AuthController } from '../src/auth/auth.controller'
import { ClientsController } from '../src/clients/clients.controller'

type JsonRecord = Record<string, any>

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    token?: string
    body?: JsonRecord
  } = {},
): Promise<{ status: number; body: JsonRecord }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : {}

  return {
    status: response.status,
    body,
  }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/auth', new AuthController().router())
  app.use('/api/clients', new ClientsController().router())

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

async function runClientRouteTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const adminEmail = uniqueEmail('route-admin')
  const clientEmail = uniqueEmail('route-client')
  const inviteEmail = uniqueEmail('route-invite')
  const organization = await prisma.clientOrganization.create({
    data: {
      name: `Route Test Client ${suffix}`,
      slug: `route-test-client-${suffix}`,
      websiteUrl: 'https://route-test.example.com',
    },
  })
  const otherOrganization = await prisma.clientOrganization.create({
    data: {
      name: `Route Test Other Client ${suffix}`,
      slug: `route-test-other-client-${suffix}`,
      websiteUrl: 'https://route-test-other.example.com',
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Route Test Admin',
      status: 'active',
      isApproved: true,
      roles: {
        create: {
          role: 'admin',
        },
      },
    },
  })

  const client = await prisma.user.create({
    data: {
      email: clientEmail,
      name: 'Route Test Client User',
      status: 'active',
      isApproved: true,
      clientMemberships: {
        create: {
          organizationId: organization.id,
          role: 'client_owner',
          status: 'active',
        },
      },
    },
  })

  const adminToken = JwtService.generateAccessToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name || undefined,
  })
  const clientToken = JwtService.generateAccessToken({
    userId: client.id,
    email: client.email,
    name: client.name || undefined,
  })

  try {
    await withServer(async (baseUrl) => {
      const missingToken = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/invitations`,
        {
          method: 'POST',
          body: { email: inviteEmail, name: 'Invited Client' },
        },
      )
      assert.equal(missingToken.status, 401)

      const unauthorized = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/invitations`,
        {
          method: 'POST',
          token: clientToken,
          body: { email: inviteEmail, name: 'Invited Client' },
        },
      )
      assert.equal(unauthorized.status, 403)

      const invite = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/invitations`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            email: ` ${inviteEmail.toUpperCase()} `,
            name: ' Invited Client ',
            role: 'admin',
            status: 'active',
            organizationId: 'org-evil',
            isApproved: false,
          },
        },
      )

      assert.equal(invite.status, 201)
      assert.equal(invite.body.user.email, inviteEmail)
      assert.equal(invite.body.user.name, 'Invited Client')
      assert.equal(invite.body.user.role, 'client')
      assert.equal(invite.body.membership.organizationId, organization.id)
      assert.equal(invite.body.membership.role, 'client_admin')
      assert.equal(invite.body.membership.status, 'active')
      assert.equal(invite.body.invite.setupRequired, true)
      assert.equal(typeof invite.body.invite.setupUrl, 'string')
      assert.equal('password' in invite.body.user, false)
      assert.equal('passwordResetToken' in invite.body.user, false)
      assert.equal('organizationId' in invite.body.user, false)

      const setupUrl = new URL(invite.body.invite.setupUrl)
      const token = setupUrl.searchParams.get('token')
      const email = setupUrl.searchParams.get('email')
      assert.ok(token)
      assert.equal(email, inviteEmail)

      const reset = await requestJson(baseUrl, '/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: inviteEmail,
          password: 'Client12345',
        },
      })
      assert.equal(reset.status, 200)

      const login = await requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          email: inviteEmail,
          password: 'Client12345',
        },
      })
      assert.equal(login.status, 200)
      assert.equal(login.body.user.email, inviteEmail)

      const visibleOrganizations = await requestJson(baseUrl, '/api/clients/organizations', {
        token: login.body.tokens.accessToken,
      })
      assert.equal(visibleOrganizations.status, 200)
      assert.deepEqual(
        visibleOrganizations.body.map((item: JsonRecord) => item.id),
        [organization.id],
      )

      const otherOverview = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/overview`,
        {
          token: clientToken,
        },
      )
      assert.equal(otherOverview.status, 403)

      const otherTicket = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/tickets`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            title: 'Other client request',
            description: 'This belongs to another client.',
            category: 'support',
            priority: 'normal',
          },
        },
      )
      assert.equal(otherTicket.status, 201)

      const otherTicketsList = await requestJson(
        baseUrl,
        `/api/clients/tickets?organizationId=${otherOrganization.id}`,
        {
          token: clientToken,
        },
      )
      assert.equal(otherTicketsList.status, 403)

      const clientWorkItemAttempt = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/work-items`,
        {
          method: 'POST',
          token: clientToken,
          body: {
            title: 'Client should not create work items',
            status: 'in_progress',
          },
        },
      )
      assert.equal(clientWorkItemAttempt.status, 403)

      const otherApproval = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/approvals`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            title: 'Other approval',
            description: 'Wrong tenant response should fail.',
            status: 'pending',
            visibleToClient: true,
          },
        },
      )
      assert.equal(otherApproval.status, 201)

      const otherApprovalResponse = await requestJson(
        baseUrl,
        `/api/clients/approvals/${otherApproval.body.id}/respond`,
        {
          method: 'PATCH',
          token: clientToken,
          body: {
            status: 'approved',
            responseNote: 'This client should not be able to answer.',
          },
        },
      )
      assert.equal(otherApprovalResponse.status, 403)

      const clientArchiveAttempt = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/status`,
        {
          method: 'PATCH',
          token: login.body.tokens.accessToken,
          body: { status: 'archived' },
        },
      )
      assert.equal(clientArchiveAttempt.status, 403)

      const invalidArchiveStatus = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/status`,
        {
          method: 'PATCH',
          token: adminToken,
          body: { status: 'deleted' },
        },
      )
      assert.equal(invalidArchiveStatus.status, 400)

      const archived = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/status`,
        {
          method: 'PATCH',
          token: adminToken,
          body: { status: ' archived ' },
        },
      )
      assert.equal(archived.status, 200)
      assert.equal(archived.body.id, organization.id)
      assert.equal(archived.body.status, 'archived')

      const hiddenArchivedOrganizations = await requestJson(baseUrl, '/api/clients/organizations', {
        token: login.body.tokens.accessToken,
      })
      assert.equal(hiddenArchivedOrganizations.status, 200)
      assert.deepEqual(hiddenArchivedOrganizations.body, [])

      const archivedOverview = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/overview`,
        {
          token: login.body.tokens.accessToken,
        },
      )
      assert.equal(archivedOverview.status, 403)

      const adminOrganizations = await requestJson(baseUrl, '/api/clients/organizations', {
        token: adminToken,
      })
      assert.equal(adminOrganizations.status, 200)
      assert.equal(
        adminOrganizations.body.some((item: JsonRecord) => item.id === organization.id && item.status === 'archived'),
        true,
      )

      const restored = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/status`,
        {
          method: 'PATCH',
          token: adminToken,
          body: { status: 'active' },
        },
      )
      assert.equal(restored.status, 200)
      assert.equal(restored.body.status, 'active')

      const restoredClientOrganizations = await requestJson(baseUrl, '/api/clients/organizations', {
        token: login.body.tokens.accessToken,
      })
      assert.equal(restoredClientOrganizations.status, 200)
      assert.deepEqual(
        restoredClientOrganizations.body.map((item: JsonRecord) => item.id),
        [organization.id],
      )

      const calendarItem = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/calendar-items`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            title: 'Launch date',
            status: 'scheduled',
            startAt: '2026-06-05',
            visibleToClient: true,
          },
        },
      )
      assert.equal(calendarItem.status, 201)
      assert.equal(calendarItem.body.title, 'Launch date')

      const clientDeleteCalendarAttempt = await requestJson(
        baseUrl,
        `/api/clients/calendar-items/${calendarItem.body.id}`,
        {
          method: 'DELETE',
          token: login.body.tokens.accessToken,
        },
      )
      assert.equal(clientDeleteCalendarAttempt.status, 403)

      const deletedCalendarItem = await requestJson(
        baseUrl,
        `/api/clients/calendar-items/${calendarItem.body.id}`,
        {
          method: 'DELETE',
          token: adminToken,
        },
      )
      assert.equal(deletedCalendarItem.status, 204)
      assert.deepEqual(deletedCalendarItem.body, {})

      const missingCalendarItem = await requestJson(
        baseUrl,
        `/api/clients/calendar-items/${calendarItem.body.id}`,
        {
          method: 'DELETE',
          token: adminToken,
        },
      )
      assert.equal(missingCalendarItem.status, 404)

      const overviewAfterCalendarDelete = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/overview`,
        {
          token: adminToken,
        },
      )
      assert.equal(overviewAfterCalendarDelete.status, 200)
      assert.equal(
        overviewAfterCalendarDelete.body.calendarItems.some((item: JsonRecord) => item.id === calendarItem.body.id),
        false,
      )
    })
  } finally {
    await prisma.clientMembership.deleteMany({
      where: { organizationId: { in: [organization.id, otherOrganization.id] } },
    })
    await prisma.clientOrganization.deleteMany({
      where: { id: { in: [organization.id, otherOrganization.id] } },
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [adminEmail, clientEmail, inviteEmail],
        },
      },
    })
  }
}

runClientRouteTests()
  .then(() => {
    console.log('clients.routes tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
