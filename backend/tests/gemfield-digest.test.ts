import assert from 'node:assert/strict'
import { buildGemfieldDigest, type DigestPipelineItem } from '../src/clients/gemfield/gemfield-digest'

const item = (over: Partial<DigestPipelineItem>): DigestPipelineItem => ({
  status: 'new',
  ticketKind: null,
  assignedToId: null,
  sla: { firstResponse: 'on_track', resolution: 'on_track' },
  ...over,
})

function run(): void {
  // Empty pipeline.
  const empty = buildGemfieldDigest([])
  assert.equal(empty.openCount, 0)
  assert.equal(empty.message, 'No open requests right now.')

  const items: DigestPipelineItem[] = [
    item({ status: 'new' }),
    item({ status: 'triaged', ticketKind: 'dev_assist' }),
    item({ status: 'in_progress', assignedToId: 'u1' }),
    item({ status: 'waiting_on_client', sla: { firstResponse: 'breached', resolution: 'on_track' } }),
    item({ status: 'resolved' }), // closed -> excluded
    item({ status: 'closed' }), // closed -> excluded
  ]
  const digest = buildGemfieldDigest(items)

  assert.equal(digest.openCount, 4, 'only open statuses are counted (resolved/closed excluded)')
  assert.equal(digest.devAssistCount, 1, 'one dev-assist among open')
  assert.equal(digest.breachedCount, 1, 'one SLA-breached among open')
  assert.equal(digest.unassignedOpenCount, 3, 'open minus the single assigned one')
  assert.equal(digest.byStatus.new, 1)
  assert.equal(digest.byStatus.waiting_on_client, 1)
  assert.ok(digest.title.includes('4 open'), 'title reflects open count')
  assert.ok(digest.message.includes('dev-assist'), 'message mentions dev-assist')
  assert.ok(digest.message.includes('SLA-breached'), 'message mentions breaches')
  assert.ok(digest.message.includes('unassigned'), 'message mentions unassigned')
}

run()
console.log('gemfield-digest tests passed')
