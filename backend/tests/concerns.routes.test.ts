import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { ConcernsController } from '../src/concerns/concerns.controller'
import { BODY_MAX_LENGTH, SUBJECT_MAX_LENGTH, statusAfterReply } from '../src/concerns/concerns.rules'

/**
 * Concerns (internal tickets) on the real test database: who may raise, read,
 * reply, close, reopen and reassign, the supervisor rule, status moves,
 * ticket numbers and the stored bell notifications.
 */

type JsonRecord = Record<string, any>
type Caller = { id: string; email: string }

async function requestJson(
  baseUrl: string,
  path: string,
  options: { method?: string; as?: Caller; body?: JsonRecord } = {},
): Promise<{ status: number; body: JsonRecord }> {
  const token = options.as ? JwtService.generateAccessToken({ userId: options.as.id, email: options.as.email }) : undefined
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/api/concerns', new ConcernsController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    return await run(baseUrl)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

function testStatusRule() {
  const ticket = { requesterId: 'req', assigneeId: 'sup', status: 'open' }
  assert.equal(statusAfterReply(ticket, 'sup'), 'answered')
  assert.equal(statusAfterReply({ ...ticket, status: 'answered' }, 'req'), 'open')
  assert.equal(statusAfterReply({ ...ticket, status: 'answered' }, 'admin'), 'answered', 'a third party leaves the status')
}

async function runConcernRouteTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const department = await prisma.department.create({ data: { name: `Concerns QA ${suffix}` } })
  const createdIds: string[] = []

  async function member(key: string, role: string, extra: { status?: string; managerId?: string } = {}) {
    const user = await prisma.user.create({
      data: {
        email: `concerns-${key}-${suffix}@example.com`,
        name: `Concerns ${key}`,
        status: extra.status || 'active',
        isApproved: true,
        managerId: extra.managerId,
        roles: { create: { role, departmentId: department.id } },
      },
      select: { id: true, email: true },
    })
    createdIds.push(user.id)
    return user
  }

  try {
    const admin = await member('admin', 'admin')
    const supervisor = await member('supervisor', 'operations_manager')
    const lead = await member('lead', 'Inventory VA')
    const worker = await member('worker', 'Inventory VA', { managerId: lead.id })
    const outsider = await member('outsider', 'Inventory VA')
    const peer = await member('peer', 'Inventory VA')
    const inactiveBoss = await member('inactive', 'operations_manager', { status: 'inactive' })
    const client = await member('client', 'client_member')

    await withServer(async (baseUrl) => {
      const raise = (as: Caller, body: JsonRecord) => requestJson(baseUrl, '/api/concerns', { method: 'POST', as, body })

      // Create: supervisor by role and by direct report; requester is always the caller.
      const first = await raise(worker, { assigneeId: supervisor.id, subject: 'Overtime on the 14th', body: 'Was my overtime approved?' })
      assert.equal(first.status, 201, JSON.stringify(first.body))
      assert.equal(first.body.status, 'open')
      assert.equal(first.body.requester.id, worker.id)
      assert.equal(first.body.assignee.id, supervisor.id)
      assert.equal(first.body.messages.length, 1)
      assert.equal(first.body.messages[0].author.id, worker.id)
      const ticketId: string = first.body.id

      const second = await raise(worker, { assigneeId: lead.id, subject: 'Schedule swap', body: 'Can I swap Friday?' })
      assert.equal(second.status, 201, 'a member with a direct report is a supervisor')
      assert.ok(second.body.number > first.body.number, 'ticket numbers increase')

      // Supervisor rule and refusals on create.
      assert.equal((await raise(worker, { assigneeId: peer.id, subject: 'Hello there', body: 'Hi' })).status, 400, 'a peer is not a supervisor')
      assert.equal((await raise(worker, { assigneeId: worker.id, subject: 'Hello there', body: 'Hi' })).status, 400, 'not to yourself')
      assert.equal((await raise(worker, { assigneeId: inactiveBoss.id, subject: 'Hello there', body: 'Hi' })).status, 400, 'not to an inactive member')
      assert.equal((await raise(client, { assigneeId: supervisor.id, subject: 'Hello there', body: 'Hi' })).status, 403, 'client accounts are refused')
      const adminToPeer = await raise(admin, { assigneeId: peer.id, subject: 'Desk move', body: 'Please confirm your desk.' })
      assert.equal(adminToPeer.status, 201, 'full access may raise a concern with any member')

      // Validation.
      assert.equal((await raise(worker, { assigneeId: supervisor.id, subject: 'Hi', body: 'x' })).status, 400)
      assert.equal((await raise(worker, { assigneeId: supervisor.id, subject: 'x'.repeat(SUBJECT_MAX_LENGTH + 1), body: 'x' })).status, 400)
      assert.equal((await raise(worker, { assigneeId: supervisor.id, subject: 'Valid subject', body: '   ' })).status, 400)
      assert.equal((await raise(worker, { assigneeId: supervisor.id, subject: 'Valid subject', body: 'x'.repeat(BODY_MAX_LENGTH + 1) })).status, 400)
      assert.equal((await raise(worker, { subject: 'Valid subject', body: 'x' })).status, 400)

      // Read access: requester, assignee, full access; outsider 403; unknown 404.
      const path = `/api/concerns/${ticketId}`
      assert.equal((await requestJson(baseUrl, path, { as: worker })).status, 200)
      assert.equal((await requestJson(baseUrl, path, { as: supervisor })).status, 200)
      assert.equal((await requestJson(baseUrl, path, { as: admin })).status, 200)
      assert.equal((await requestJson(baseUrl, path, { as: outsider })).status, 403)
      assert.equal((await requestJson(baseUrl, '/api/concerns/does-not-exist', { as: worker })).status, 404)
      assert.equal((await requestJson(baseUrl, path)).status, 401)

      // Replies move the status.
      const reply = (as: Caller, body: string) => requestJson(baseUrl, `${path}/messages`, { method: 'POST', as, body: { body } })
      const answered = await reply(supervisor, 'Yes, approved on Monday.')
      assert.equal(answered.status, 201)
      assert.equal(answered.body.status, 'answered')
      assert.equal(answered.body.messages.length, 2)
      const followUp = await reply(worker, 'Thanks, one more question.')
      assert.equal(followUp.body.status, 'open')
      assert.equal((await reply(outsider, 'Can I see this?')).status, 403)
      assert.equal((await reply(worker, '')).status, 400)

      // Close and reopen: either party, with guarded transitions.
      const action = (as: Caller, verb: 'close' | 'reopen') => requestJson(baseUrl, `${path}/${verb}`, { method: 'POST', as })
      assert.equal((await action(outsider, 'close')).status, 403)
      assert.equal((await action(admin, 'close')).status, 403, 'full access reads, but only the parties close')
      const closed = await action(worker, 'close')
      assert.equal(closed.status, 200)
      assert.equal(closed.body.status, 'closed')
      assert.ok(closed.body.closedAt)
      assert.equal(closed.body.permissions.canReply, false)
      assert.equal(closed.body.permissions.canReopen, true)
      assert.equal((await action(worker, 'close')).status, 409)
      assert.equal((await reply(supervisor, 'Late reply')).status, 409, 'closed concerns take no replies')
      const reopened = await action(supervisor, 'reopen')
      assert.equal(reopened.status, 200)
      assert.equal(reopened.body.status, 'open')
      assert.equal(reopened.body.closedAt, null)
      assert.equal((await action(supervisor, 'reopen')).status, 409)

      // Lists: boxes, counts, filters, the All box.
      const inbox = await requestJson(baseUrl, '/api/concerns?box=inbox', { as: supervisor })
      assert.equal(inbox.status, 200)
      assert.ok(inbox.body.items.some((item: JsonRecord) => item.id === ticketId))
      const sent = await requestJson(baseUrl, '/api/concerns?box=sent', { as: worker })
      assert.deepEqual(sent.body.items.map((item: JsonRecord) => item.id).sort(), [ticketId, second.body.id].sort())
      assert.deepEqual(sent.body.counts, { open: 2, answered: 0, closed: 0 })
      const searched = await requestJson(baseUrl, '/api/concerns?box=sent&q=swap', { as: worker })
      assert.deepEqual(searched.body.items.map((item: JsonRecord) => item.id), [second.body.id])
      const closedOnly = await requestJson(baseUrl, '/api/concerns?box=sent&status=closed', { as: worker })
      assert.equal(closedOnly.body.items.length, 0)
      assert.equal((await requestJson(baseUrl, '/api/concerns?box=all', { as: worker })).status, 403)
      // The All box is full access only (review fix 2026-10-28): a manager sees no subjects or people of other concerns.
      assert.equal((await requestJson(baseUrl, '/api/concerns?box=all', { as: supervisor })).status, 403, 'management roles do not see All')
      assert.equal(inbox.body.viewer.canListAll, false, 'the All tab stays hidden for managers')
      const everyConcern = await requestJson(baseUrl, '/api/concerns?box=all', { as: admin })
      assert.equal(everyConcern.status, 200, 'full access sees All')
      assert.equal(everyConcern.body.viewer.canListAll, true)
      assert.ok(everyConcern.body.items.some((item: JsonRecord) => item.id === ticketId))
      assert.equal((await requestJson(baseUrl, '/api/concerns?box=nope', { as: worker })).status, 400)
      assert.equal((await requestJson(baseUrl, '/api/concerns?status=nope', { as: worker })).status, 400)

      // Reassign: assignee or full access, new assignee must be a supervisor.
      const reassign = (as: Caller, assigneeId: string) => requestJson(baseUrl, path, { method: 'PATCH', as, body: { assigneeId } })
      assert.equal((await reassign(worker, lead.id)).status, 403, 'the requester cannot reassign')
      assert.equal((await reassign(supervisor, peer.id)).status, 400, 'not to a non-supervisor')
      assert.equal((await reassign(supervisor, worker.id)).status, 400, 'not to the requester')
      const handedOn = await reassign(supervisor, lead.id)
      assert.equal(handedOn.status, 200)
      assert.equal(handedOn.body.canView, false, 'the previous assignee drops off')
      assert.equal((await requestJson(baseUrl, path, { as: supervisor })).status, 403)
      const byAdmin = await reassign(admin, supervisor.id)
      assert.equal(byAdmin.status, 200)
      assert.equal(byAdmin.body.assignee.id, supervisor.id)

      // Every change told the other party, with a deep link.
      const rows = await prisma.userNotification.findMany({
        where: { userId: { in: [worker.id, supervisor.id, lead.id] }, link: `/concerns/${ticketId}` },
        select: { userId: true, title: true },
      })
      const titlesFor = (userId: string) => rows.filter((row) => row.userId === userId).map((row) => row.title)
      const number = first.body.number
      assert.ok(titlesFor(supervisor.id).includes(`New concern #${number}`))
      assert.ok(titlesFor(worker.id).includes(`Reply on concern #${number}`))
      assert.ok(titlesFor(supervisor.id).includes(`Concern #${number} closed`))
      assert.ok(titlesFor(worker.id).includes(`Concern #${number} reopened`))
      assert.ok(titlesFor(lead.id).includes(`Concern #${number} reassigned`))
      assert.ok(!titlesFor(worker.id).includes(`New concern #${number}`), 'the actor is never notified')
    })
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } })
    await prisma.department.deleteMany({ where: { id: department.id } })
  }
}

async function main() {
  testStatusRule()
  await runConcernRouteTests()
  console.log('concerns.routes tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
