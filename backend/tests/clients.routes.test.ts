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
  let createdOrganizationId: string | undefined
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

      const createdOrganization = await requestJson(baseUrl, '/api/clients/organizations', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Route Created Client ${suffix}`,
          slug: `route-created-client-${suffix}`,
          websiteUrl: 'https://route-created.example.com',
          websiteWorkType: 'new-build',
          notes: 'Created through route test.',
        },
      })
      assert.equal(createdOrganization.status, 201)
      assert.equal(createdOrganization.body.websiteUrl, 'https://route-created.example.com')
      assert.equal(createdOrganization.body.websiteWorkType, 'new_build')
      assert.equal(createdOrganization.body.notes, 'Created through route test.')
      createdOrganizationId = createdOrganization.body.id

      const invalidWebsiteWorkType = await requestJson(baseUrl, '/api/clients/organizations', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Route Invalid Website Work ${suffix}`,
          slug: `route-invalid-website-work-${suffix}`,
          websiteWorkType: 'quick refresh',
        },
      })
      assert.equal(invalidWebsiteWorkType.status, 400)

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

      await prisma.clientActivity.createMany({
        data: [
          {
            organizationId: organization.id,
            actorId: admin.id,
            type: 'ticket_internal_note_created',
            subjectType: 'ticket',
            subjectId: 'ticket-internal',
            visibility: 'internal',
            title: 'Internal note recorded',
            body: 'Internal note should stay hidden from clients.',
            metadata: { source: 'route-test' },
          },
          {
            organizationId: organization.id,
            actorId: admin.id,
            type: 'ticket_client_reply_created',
            subjectType: 'ticket',
            subjectId: 'ticket-client-visible',
            visibility: 'client',
            title: 'Client-visible reply recorded',
            body: 'Client-visible activity should be returned to clients.',
            metadata: { source: 'route-test' },
          },
          {
            organizationId: otherOrganization.id,
            actorId: admin.id,
            type: 'ticket_client_reply_created',
            subjectType: 'ticket',
            subjectId: 'ticket-other-client',
            visibility: 'client',
            title: 'Other client activity',
          },
        ],
      })

      const adminActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?limit=10`,
        { token: adminToken },
      )
      assert.equal(adminActivity.status, 200)
      assert.equal(adminActivity.body.some((activity: JsonRecord) => activity.visibility === 'internal'), true)
      assert.equal(adminActivity.body.some((activity: JsonRecord) => activity.metadata?.source === 'route-test'), true)

      const clientActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?limit=10&visibility=internal`,
        { token: login.body.tokens.accessToken },
      )
      assert.equal(clientActivity.status, 200)
      assert.deepEqual(
        clientActivity.body.map((activity: JsonRecord) => activity.visibility),
        ['client'],
      )
      assert.equal('metadata' in clientActivity.body[0], false)

      const invalidActivityFilter = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?visibility=private`,
        { token: adminToken },
      )
      assert.equal(invalidActivityFilter.status, 400)

      const otherOverview = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/overview`,
        {
          token: clientToken,
        },
      )
      assert.equal(otherOverview.status, 403)

      const clientTierCreateAttempt = await requestJson(baseUrl, '/api/clients/service-tiers', {
        method: 'POST',
        token: clientToken,
        body: {
          name: `Client Tier Attempt ${suffix}`,
        },
      })
      assert.equal(clientTierCreateAttempt.status, 403)

      const tier = await requestJson(baseUrl, '/api/clients/service-tiers', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Growth Care ${suffix}`,
          description: 'Lead generation, reporting, and priority request support.',
          monthlyPrice: 1750,
          priorityRank: 20,
        },
      })
      assert.equal(tier.status, 201)
      assert.equal(tier.body.name, `Growth Care ${suffix}`)
      assert.equal(tier.body.description, 'Lead generation, reporting, and priority request support.')
      assert.equal(tier.body.monthlyPrice, 1750)
      assert.equal(tier.body.priorityRank, 20)

      const updatedTier = await requestJson(baseUrl, `/api/clients/service-tiers/${tier.body.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          name: `Premium Care ${suffix}`,
          description: '',
          monthlyPrice: '',
          priorityRank: 30,
        },
      })
      assert.equal(updatedTier.status, 200)
      assert.equal(updatedTier.body.name, `Premium Care ${suffix}`)
      assert.equal(updatedTier.body.description, null)
      assert.equal(updatedTier.body.monthlyPrice, null)
      assert.equal(updatedTier.body.priorityRank, 30)

      const tiers = await requestJson(baseUrl, '/api/clients/service-tiers', {
        token: adminToken,
      })
      assert.equal(tiers.status, 200)
      assert.equal(
        tiers.body.some((item: JsonRecord) => item.id === tier.body.id && item.name === `Premium Care ${suffix}`),
        true,
      )

      const clientTierListAttempt = await requestJson(baseUrl, '/api/clients/service-tiers', {
        token: clientToken,
      })
      assert.equal(clientTierListAttempt.status, 403)

      const clientTierAssignAttempt = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/service-tier`,
        {
          method: 'PATCH',
          token: clientToken,
          body: { tierId: tier.body.id },
        },
      )
      assert.equal(clientTierAssignAttempt.status, 403)

      const assignedTier = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/service-tier`,
        {
          method: 'PATCH',
          token: adminToken,
          body: { tierId: tier.body.id },
        },
      )
      assert.equal(assignedTier.status, 200)
      assert.equal(assignedTier.body.id, organization.id)
      assert.equal(assignedTier.body.tierId, tier.body.id)
      assert.equal(assignedTier.body.tier.name, `Premium Care ${suffix}`)

      const clientOrganizationsWithTier = await requestJson(baseUrl, '/api/clients/organizations', {
        token: clientToken,
      })
      assert.equal(clientOrganizationsWithTier.status, 200)
      assert.equal(clientOrganizationsWithTier.body[0].tier.name, `Premium Care ${suffix}`)
      assert.equal('monthlyPrice' in clientOrganizationsWithTier.body[0].tier, false)
      assert.equal('priorityRank' in clientOrganizationsWithTier.body[0].tier, false)

      const clearedTier = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/service-tier`,
        {
          method: 'PATCH',
          token: adminToken,
          body: { tierId: null },
        },
      )
      assert.equal(clearedTier.status, 200)
      assert.equal(clearedTier.body.tierId, null)
      assert.equal(clearedTier.body.tier, null)

      const serviceTierActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=organization&subjectId=${organization.id}`,
        { token: adminToken },
      )
      assert.equal(serviceTierActivity.status, 200)
      const serviceTierEvents = serviceTierActivity.body.filter(
        (activity: JsonRecord) => activity.type === 'organization_service_tier_updated',
      )
      assert.equal(serviceTierEvents.length, 2)
      assert.equal(
        serviceTierEvents.some((activity: JsonRecord) => activity.metadata?.tierName === `Premium Care ${suffix}`),
        true,
      )
      assert.equal(
        serviceTierEvents.some((activity: JsonRecord) => activity.metadata?.previousTierName === `Premium Care ${suffix}`),
        true,
      )

      const clientServiceTierActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=organization&subjectId=${organization.id}`,
        { token: login.body.tokens.accessToken },
      )
      assert.equal(clientServiceTierActivity.status, 200)
      assert.equal(
        clientServiceTierActivity.body.some((activity: JsonRecord) => activity.type === 'organization_service_tier_updated'),
        false,
      )

      const deletableTier = await requestJson(baseUrl, '/api/clients/service-tiers', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Delete Me ${suffix}`,
          monthlyPrice: 2500,
          priorityRank: 5,
        },
      })
      assert.equal(deletableTier.status, 201)

      const assignedDeletableTier = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/service-tier`,
        {
          method: 'PATCH',
          token: adminToken,
          body: { tierId: deletableTier.body.id },
        },
      )
      assert.equal(assignedDeletableTier.status, 200)
      assert.equal(assignedDeletableTier.body.tierId, deletableTier.body.id)

      const clientTierDeleteAttempt = await requestJson(baseUrl, `/api/clients/service-tiers/${deletableTier.body.id}`, {
        method: 'DELETE',
        token: clientToken,
      })
      assert.equal(clientTierDeleteAttempt.status, 403)

      const deletedTier = await requestJson(baseUrl, `/api/clients/service-tiers/${deletableTier.body.id}`, {
        method: 'DELETE',
        token: adminToken,
      })
      assert.equal(deletedTier.status, 200)
      assert.equal(deletedTier.body.deleted, true)
      assert.equal(deletedTier.body.id, deletableTier.body.id)

      const tiersAfterDelete = await requestJson(baseUrl, '/api/clients/service-tiers', {
        token: adminToken,
      })
      assert.equal(tiersAfterDelete.status, 200)
      assert.equal(
        tiersAfterDelete.body.some((item: JsonRecord) => item.id === deletableTier.body.id),
        false,
      )

      const organizationsAfterTierDelete = await requestJson(baseUrl, '/api/clients/organizations', {
        token: adminToken,
      })
      assert.equal(organizationsAfterTierDelete.status, 200)
      const organizationAfterTierDelete = organizationsAfterTierDelete.body.find(
        (item: JsonRecord) => item.id === organization.id,
      )
      assert.equal(organizationAfterTierDelete.tierId, null)
      assert.equal(organizationAfterTierDelete.tier, null)

      const missingTierDelete = await requestJson(baseUrl, `/api/clients/service-tiers/${deletableTier.body.id}`, {
        method: 'DELETE',
        token: adminToken,
      })
      assert.equal(missingTierDelete.status, 404)

      const invalidTier = await requestJson(baseUrl, '/api/clients/service-tiers', {
        method: 'POST',
        token: adminToken,
        body: {
          name: 'Invalid price tier',
          monthlyPrice: -1,
        },
      })
      assert.equal(invalidTier.status, 400)

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

      const otherActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/activity`,
        {
          token: clientToken,
        },
      )
      assert.equal(otherActivity.status, 403)

      const clientTicket = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/tickets`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            title: 'Need homepage copy reviewed',
            description: 'Please check the homepage copy.',
            category: 'review',
            priority: 'high',
          },
        },
      )
      assert.equal(clientTicket.status, 201)

      const updatedClientTicket = await requestJson(
        baseUrl,
        `/api/clients/tickets/${clientTicket.body.id}`,
        {
          method: 'PATCH',
          token: login.body.tokens.accessToken,
          body: {
            title: 'Need homepage copy and hours reviewed',
            description: 'Please check the homepage copy and service hours.',
            category: 'review',
            priority: 'normal',
            internalNotes: 'should not be accepted',
          },
        },
      )
      assert.equal(updatedClientTicket.status, 200)
      assert.equal(updatedClientTicket.body.title, 'Need homepage copy and hours reviewed')
      assert.equal(updatedClientTicket.body.priority, 'normal')
      assert.equal('internalNotes' in updatedClientTicket.body, false)

      const temporaryTicket = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/tickets`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            title: 'Temporary request',
            description: 'This request can be removed before conversation starts.',
            category: 'support',
            priority: 'low',
          },
        },
      )
      assert.equal(temporaryTicket.status, 201)

      const deletedTemporaryTicket = await requestJson(
        baseUrl,
        `/api/clients/tickets/${temporaryTicket.body.id}`,
        {
          method: 'DELETE',
          token: login.body.tokens.accessToken,
        },
      )
      assert.equal(deletedTemporaryTicket.status, 204)

      const adminQueue = await requestJson(
        baseUrl,
        `/api/clients/activity/queue?organizationId=${organization.id}`,
        { token: adminToken },
      )
      assert.equal(adminQueue.status, 200)
      assert.equal(adminQueue.body.some((item: JsonRecord) => item.category === 'team_response_needed'), true)

      const clientQueueBeforeReply = await requestJson(
        baseUrl,
        `/api/clients/activity/queue?organizationId=${organization.id}`,
        { token: login.body.tokens.accessToken },
      )
      assert.equal(clientQueueBeforeReply.status, 200)
      assert.equal(
        clientQueueBeforeReply.body.some((item: JsonRecord) => item.category === 'team_response_needed'),
        false,
      )

      const ticketReply = await requestJson(
        baseUrl,
        `/api/clients/tickets/${clientTicket.body.id}/comments`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            body: 'This is ready for your review.',
            visibility: 'client',
          },
        },
      )
      assert.equal(ticketReply.status, 201)

      const deleteTicketWithConversation = await requestJson(
        baseUrl,
        `/api/clients/tickets/${clientTicket.body.id}`,
        {
          method: 'DELETE',
          token: login.body.tokens.accessToken,
        },
      )
      assert.equal(deleteTicketWithConversation.status, 409)

      const ticketActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=ticket&subjectId=${clientTicket.body.id}`,
        { token: adminToken },
      )
      assert.equal(ticketActivity.status, 200)
      assert.equal(
        ticketActivity.body.some((activity: JsonRecord) => activity.type === 'ticket_created'),
        true,
      )
      assert.equal(
        ticketActivity.body.some((activity: JsonRecord) => activity.type === 'ticket_client_reply_created'),
        true,
      )
      assert.equal(
        ticketActivity.body.some((activity: JsonRecord) => activity.type === 'ticket_updated'),
        true,
      )

      const clientQueueAfterReply = await requestJson(
        baseUrl,
        `/api/clients/activity/queue?organizationId=${organization.id}`,
        { token: login.body.tokens.accessToken },
      )
      assert.equal(clientQueueAfterReply.status, 200)
      assert.equal(
        clientQueueAfterReply.body.some((item: JsonRecord) => item.category === 'client_response_needed'),
        true,
      )

      const otherQueue = await requestJson(
        baseUrl,
        `/api/clients/activity/queue?organizationId=${otherOrganization.id}`,
        { token: clientToken },
      )
      assert.equal(otherQueue.status, 403)

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

      const clientResource = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/resources`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            label: 'Client shared brief',
            url: 'https://client.example.com/brief',
            type: 'internal_reference',
            projectId: 'project-should-not-be-trusted',
            visibleToClient: false,
          },
        },
      )
      assert.equal(clientResource.status, 201)
      assert.equal(clientResource.body.label, 'Client shared brief')
      assert.equal(clientResource.body.type, 'client_link')
      assert.equal(clientResource.body.projectId, null)
      assert.equal(clientResource.body.createdById, login.body.user.id)
      assert.equal('visibleToClient' in clientResource.body, false)

      const storedClientResource = await prisma.clientResourceLink.findUnique({
        where: { id: clientResource.body.id },
      })
      assert.ok(storedClientResource)
      assert.equal(storedClientResource.organizationId, organization.id)
      assert.equal(storedClientResource.projectId, null)
      assert.equal(storedClientResource.type, 'client_link')
      assert.equal(storedClientResource.visibleToClient, true)
      assert.equal(storedClientResource.createdById, login.body.user.id)

      const updatedClientResource = await requestJson(
        baseUrl,
        `/api/clients/resources/${clientResource.body.id}`,
        {
          method: 'PATCH',
          token: login.body.tokens.accessToken,
          body: {
            label: 'Updated client shared brief',
            url: 'https://client.example.com/brief-v2',
            type: 'admin_only',
            visibleToClient: false,
          },
        },
      )
      assert.equal(updatedClientResource.status, 200)
      assert.equal(updatedClientResource.body.label, 'Updated client shared brief')
      assert.equal(updatedClientResource.body.url, 'https://client.example.com/brief-v2')
      assert.equal(updatedClientResource.body.type, 'client_link')

      const updatedStoredClientResource = await prisma.clientResourceLink.findUnique({
        where: { id: clientResource.body.id },
      })
      assert.ok(updatedStoredClientResource)
      assert.equal(updatedStoredClientResource.visibleToClient, true)

      const deletedClientResource = await requestJson(
        baseUrl,
        `/api/clients/resources/${clientResource.body.id}`,
        {
          method: 'DELETE',
          token: login.body.tokens.accessToken,
        },
      )
      assert.equal(deletedClientResource.status, 204)

      const unsafeClientResource = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/resources`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            label: 'Unsafe resource',
            url: 'javascript:alert(1)',
          },
        },
      )
      assert.equal(unsafeClientResource.status, 400)

      const otherClientResource = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/resources`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            label: 'Other client link',
            url: 'https://client.example.com/other',
          },
        },
      )
      assert.equal(otherClientResource.status, 403)

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

      const clientApproval = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/approvals`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            title: 'Approve homepage hero',
            description: 'Please approve the homepage hero copy.',
            status: 'pending',
            visibleToClient: true,
          },
        },
      )
      assert.equal(clientApproval.status, 201)

      const approvalResponse = await requestJson(
        baseUrl,
        `/api/clients/approvals/${clientApproval.body.id}/respond`,
        {
          method: 'PATCH',
          token: login.body.tokens.accessToken,
          body: {
            status: 'changes_requested',
            responseNote: 'Please adjust the headline.',
          },
        },
      )
      assert.equal(approvalResponse.status, 200)
      assert.equal(approvalResponse.body.status, 'changes_requested')

      const approvalActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=approval&subjectId=${clientApproval.body.id}`,
        { token: adminToken },
      )
      assert.equal(approvalActivity.status, 200)
      assert.equal(
        approvalActivity.body.some((activity: JsonRecord) => activity.type === 'approval_requested'),
        true,
      )
      assert.equal(
        approvalActivity.body.some((activity: JsonRecord) => activity.type === 'approval_changes_requested'),
        true,
      )

      await prisma.clientWorkItem.create({
        data: {
          organizationId: organization.id,
          title: 'Published homepage refresh',
          description: 'Launched revised hero, copy, and contact CTA.',
          status: 'completed',
          priority: 'high',
          progress: 100,
          completedAt: new Date('2026-05-20T12:00:00.000Z'),
          visibleToClient: true,
        },
      })
      await prisma.clientTicket.create({
        data: {
          organizationId: organization.id,
          title: 'Contact form issue resolved',
          description: 'Lead capture form was tested and confirmed.',
          category: 'website',
          priority: 'normal',
          status: 'done',
          closedAt: new Date('2026-05-21T12:00:00.000Z'),
        },
      })
      await prisma.clientUpdate.create({
        data: {
          organizationId: organization.id,
          title: 'Launch progress posted',
          body: 'Homepage improvements are live and being monitored.',
          status: 'published',
          visibleToClient: true,
          createdAt: new Date('2026-05-22T12:00:00.000Z'),
        },
      })
      await prisma.clientMetricSnapshot.createMany({
        data: [
          {
            organizationId: organization.id,
            label: 'Organic leads',
            value: '12',
            unit: 'leads',
            source: 'organic',
            periodStart: new Date('2026-05-01T00:00:00.000Z'),
            periodEnd: new Date('2026-05-31T23:59:59.000Z'),
            visibleToClient: true,
          },
          {
            organizationId: organization.id,
            label: 'Missed opportunities',
            value: '2',
            source: 'lead_review',
            periodStart: new Date('2026-05-01T00:00:00.000Z'),
            periodEnd: new Date('2026-05-31T23:59:59.000Z'),
            visibleToClient: true,
          },
          {
            organizationId: organization.id,
            label: 'Google rating',
            value: '4.8',
            source: 'reviews',
            periodStart: new Date('2026-05-01T00:00:00.000Z'),
            periodEnd: new Date('2026-05-31T23:59:59.000Z'),
            visibleToClient: true,
          },
          {
            organizationId: organization.id,
            label: 'Maps ranking',
            value: '3',
            source: 'local_visibility',
            periodStart: new Date('2026-05-01T00:00:00.000Z'),
            periodEnd: new Date('2026-05-31T23:59:59.000Z'),
            visibleToClient: true,
          },
        ],
      })

      const clientDraftAttempt = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/reports/draft`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            periodStart: '2026-05-01',
            periodEnd: '2026-05-31',
          },
        },
      )
      assert.equal(clientDraftAttempt.status, 403)

      const generatedDraft = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/reports/draft`,
        {
          method: 'POST',
          token: adminToken,
          body: {
            periodStart: '2026-05-01',
            periodEnd: '2026-05-31',
          },
        },
      )
      assert.equal(generatedDraft.status, 201)
      assert.equal(generatedDraft.body.status, 'draft')
      assert.equal(generatedDraft.body.visibleToClient, true)
      assert.equal(generatedDraft.body.leadsCaptured, 12)
      assert.equal(generatedDraft.body.missedOpportunities, 2)
      assert.match(generatedDraft.body.summary, /Published homepage refresh/)
      assert.deepEqual(generatedDraft.body.leadSourceBreakdown, { organic: 12 })
      assert.deepEqual(generatedDraft.body.reputationSnapshot, { google_rating: '4.8' })
      assert.deepEqual(generatedDraft.body.localVisibilitySnapshot, { maps_ranking: '3' })

      const clientOverviewWithDraft = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/overview`,
        { token: login.body.tokens.accessToken },
      )
      assert.equal(clientOverviewWithDraft.status, 200)
      assert.equal(
        clientOverviewWithDraft.body.reports.some((report: JsonRecord) => report.id === generatedDraft.body.id),
        false,
      )

      const adminOverviewWithDraft = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/overview`,
        { token: adminToken },
      )
      assert.equal(adminOverviewWithDraft.status, 200)
      assert.equal(
        adminOverviewWithDraft.body.reports.some((report: JsonRecord) => report.id === generatedDraft.body.id),
        true,
      )

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

      const organizationActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=organization&subjectId=${organization.id}`,
        { token: adminToken },
      )
      assert.equal(organizationActivity.status, 200)
      assert.equal(
        organizationActivity.body.some((activity: JsonRecord) => activity.type === 'organization_archived'),
        true,
      )
      assert.equal(
        organizationActivity.body.some((activity: JsonRecord) => activity.type === 'organization_restored'),
        true,
      )

      const billing = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/billing-status`,
        {
          method: 'PATCH',
          token: adminToken,
          body: {
            planName: 'Growth Care',
            status: 'active',
            monthlyAmount: 750,
            currency: 'USD',
            visibleToClient: true,
          },
        },
      )
      assert.equal(billing.status, 200)

      const billingActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=billing_status&subjectId=${billing.body.id}`,
        { token: login.body.tokens.accessToken },
      )
      assert.equal(billingActivity.status, 200)
      assert.equal(
        billingActivity.body.some((activity: JsonRecord) => activity.type === 'billing_updated'),
        true,
      )

      const clientCalendarItem = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/calendar-items`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            title: 'Client planning note',
            description: 'Client wants to discuss launch timing.',
            channel: 'review',
            status: 'archived',
            startAt: '2026-06-10',
            endAt: '2026-06-11',
            projectId: 'project-should-not-be-trusted',
            visibleToClient: false,
          },
        },
      )
      assert.equal(clientCalendarItem.status, 201)
      assert.equal(clientCalendarItem.body.title, 'Client planning note')
      assert.equal(clientCalendarItem.body.status, 'planned')
      assert.equal(clientCalendarItem.body.projectId, null)
      assert.equal(clientCalendarItem.body.visibleToClient, true)
      assert.equal(clientCalendarItem.body.createdById, login.body.user.id)

      const storedClientCalendarItem = await prisma.clientCalendarItem.findUnique({
        where: { id: clientCalendarItem.body.id },
      })
      assert.ok(storedClientCalendarItem)
      assert.equal(storedClientCalendarItem.organizationId, organization.id)
      assert.equal(storedClientCalendarItem.projectId, null)
      assert.equal(storedClientCalendarItem.status, 'planned')
      assert.equal(storedClientCalendarItem.visibleToClient, true)
      assert.equal(storedClientCalendarItem.createdById, login.body.user.id)

      const invalidEndOnlyCalendarUpdate = await requestJson(
        baseUrl,
        `/api/clients/calendar-items/${clientCalendarItem.body.id}`,
        {
          method: 'PATCH',
          token: login.body.tokens.accessToken,
          body: {
            endAt: '2026-06-09',
          },
        },
      )
      assert.equal(invalidEndOnlyCalendarUpdate.status, 400)
      assert.equal(invalidEndOnlyCalendarUpdate.body.error, 'Calendar endAt must be after startAt')

      const updatedClientCalendarItem = await requestJson(
        baseUrl,
        `/api/clients/calendar-items/${clientCalendarItem.body.id}`,
        {
          method: 'PATCH',
          token: login.body.tokens.accessToken,
          body: {
            title: 'Updated client planning note',
            description: '',
            channel: '',
            status: 'archived',
            startAt: '2026-06-12',
            endAt: '',
            projectId: 'project-should-not-be-trusted',
            visibleToClient: false,
          },
        },
      )
      assert.equal(updatedClientCalendarItem.status, 200)
      assert.equal(updatedClientCalendarItem.body.title, 'Updated client planning note')
      assert.equal(updatedClientCalendarItem.body.description, null)
      assert.equal(updatedClientCalendarItem.body.channel, null)
      assert.equal(updatedClientCalendarItem.body.status, 'planned')
      assert.equal(updatedClientCalendarItem.body.endAt, null)
      assert.equal(updatedClientCalendarItem.body.visibleToClient, true)

      const otherClientCalendarItem = await requestJson(
        baseUrl,
        `/api/clients/organizations/${otherOrganization.id}/calendar-items`,
        {
          method: 'POST',
          token: login.body.tokens.accessToken,
          body: {
            title: 'Other client planning note',
            startAt: '2026-06-13',
          },
        },
      )
      assert.equal(otherClientCalendarItem.status, 403)

      const deletedClientCalendarItem = await requestJson(
        baseUrl,
        `/api/clients/calendar-items/${clientCalendarItem.body.id}`,
        {
          method: 'DELETE',
          token: login.body.tokens.accessToken,
        },
      )
      assert.equal(deletedClientCalendarItem.status, 204)

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

      const calendarActivity = await requestJson(
        baseUrl,
        `/api/clients/organizations/${organization.id}/activity?subjectType=calendar_item&subjectId=${calendarItem.body.id}`,
        { token: adminToken },
      )
      assert.equal(calendarActivity.status, 200)
      assert.equal(
        calendarActivity.body.some((activity: JsonRecord) => activity.type === 'calendar_scheduled'),
        true,
      )
      assert.equal(
        calendarActivity.body.some((activity: JsonRecord) => activity.type === 'calendar_deleted'),
        true,
      )

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
    const organizationIds = [organization.id, otherOrganization.id, createdOrganizationId].filter(
      (id): id is string => Boolean(id),
    )
    await prisma.clientMembership.deleteMany({
      where: { organizationId: { in: organizationIds } },
    })
    await prisma.clientOrganization.deleteMany({
      where: { id: { in: organizationIds } },
    })
    await prisma.clientServiceTier.deleteMany({
      where: { name: { in: [`Growth Care ${suffix}`, `Premium Care ${suffix}`] } },
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
