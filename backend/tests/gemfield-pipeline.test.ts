import assert from 'node:assert/strict'
import {
  buildSlaSummary,
  isChangeClass,
  isGemfieldTicketStatus,
  resolveTargetStatus,
} from '../src/clients/gemfield/gemfield-pipeline'

const utc = (month: number, day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, month, day, hour, minute, 0, 0))

function testStatusGuards(): void {
  assert.equal(isGemfieldTicketStatus('waiting_on_client'), true)
  assert.equal(isGemfieldTicketStatus('archived'), false)
  assert.equal(isChangeClass('quoted'), true)
  assert.equal(isChangeClass('freebie'), false)
}

function testReopenRule(): void {
  // Reopening a resolved/closed ticket routes back to triaged (with context), not straight to work.
  assert.equal(resolveTargetStatus('resolved', 'in_progress'), 'triaged', 'reopen -> triaged')
  assert.equal(resolveTargetStatus('closed', 'new'), 'triaged', 'reopen from closed -> triaged')
  // Normal forward moves are respected.
  assert.equal(resolveTargetStatus('new', 'triaged'), 'triaged')
  assert.equal(resolveTargetStatus('in_progress', 'waiting_on_client'), 'waiting_on_client')
  // Closing is respected.
  assert.equal(resolveTargetStatus('resolved', 'closed'), 'closed', 'closed is not treated as reopen')
}

function testSlaSummary(): void {
  // Fresh, no reply, open: Mon 09:00 -> 12:00 = 180 business min, under default targets.
  const fresh = buildSlaSummary({
    createdAt: utc(0, 5, 9),
    now: utc(0, 5, 12),
    status: 'in_progress',
    updatedAt: utc(0, 5, 10),
    hasClientReply: false,
  })
  assert.equal(fresh.firstResponse, 'on_track', 'fresh ticket first-response on track')
  assert.equal(fresh.resolution, 'on_track', 'fresh ticket resolution on track')

  // A client-visible reply marks first-response met regardless of elapsed.
  const replied = buildSlaSummary({
    createdAt: utc(0, 5, 9),
    now: utc(0, 5, 16),
    status: 'in_progress',
    updatedAt: utc(0, 5, 10),
    hasClientReply: true,
  })
  assert.equal(replied.firstResponse, 'met', 'a client reply meets first-response')

  // Closed => resolution met.
  const closed = buildSlaSummary({
    createdAt: utc(0, 5, 9),
    now: utc(0, 9, 17),
    status: 'resolved',
    updatedAt: utc(0, 9, 12),
    hasClientReply: false,
  })
  assert.equal(closed.resolution, 'met', 'a closed ticket meets resolution')

  // Long-open, no reply => first-response breached (default target 480 business min).
  const stale = buildSlaSummary({
    createdAt: utc(0, 5, 9),
    now: utc(0, 8, 17), // Mon 09:00 -> Thu 17:00 = ~3.5 business days
    status: 'in_progress',
    updatedAt: utc(0, 5, 10),
    hasClientReply: false,
  })
  assert.equal(stale.firstResponse, 'breached', 'a long-unanswered ticket breaches first-response')

  // Waiting on client pauses the clock: created Mon 09:00, now Mon 12:00 (180),
  // waiting since 10:00 => 120 paused => 60 effective => on track.
  const waiting = buildSlaSummary({
    createdAt: utc(0, 5, 9),
    now: utc(0, 5, 12),
    status: 'waiting_on_client',
    updatedAt: utc(0, 5, 10),
    hasClientReply: false,
  })
  assert.equal(waiting.firstResponse, 'on_track', 'waiting-on-client pauses the SLA clock')
}

testStatusGuards()
testReopenRule()
testSlaSummary()
console.log('gemfield-pipeline tests passed')
