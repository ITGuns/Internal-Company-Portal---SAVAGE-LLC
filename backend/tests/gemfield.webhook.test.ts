import assert from 'node:assert/strict'
import {
  canonicalGemfieldMessage,
  signGemfieldPayload,
  verifyGemfieldSignature,
  type GemfieldProgressPayload,
} from '../src/clients/gemfield/gemfield.webhook'
import {
  GemfieldValidationError,
  planGemfieldProgress,
} from '../src/clients/gemfield/gemfield.progress'
import { GemfieldService } from '../src/clients/gemfield/gemfield.service'

const SECRET = 'test-gemfield-secret'

const basePayload: GemfieldProgressPayload = {
  gfId: 'GF-2026-0147',
  phase: 'build',
  status: 'complete',
  note: 'Homepage build finished',
  stagingUrl: null,
  liveUrl: null,
  at: '2026-07-01T00:00:00.000Z',
}

function testSignatureVerification(): void {
  const signature = signGemfieldPayload(SECRET, basePayload)
  assert.equal(verifyGemfieldSignature(SECRET, basePayload, signature), true, 'a valid signature verifies')

  // Tampering with any signed field invalidates the signature.
  assert.equal(
    verifyGemfieldSignature(SECRET, { ...basePayload, phase: 'live' }, signature),
    false,
    'a tampered phase is rejected',
  )
  assert.equal(
    verifyGemfieldSignature(SECRET, { ...basePayload, note: 'changed' }, signature),
    false,
    'a tampered note is rejected',
  )
  assert.equal(
    verifyGemfieldSignature('wrong-secret', basePayload, signature),
    false,
    'a wrong secret is rejected',
  )
  assert.equal(verifyGemfieldSignature(SECRET, basePayload, undefined), false, 'a missing signature fails closed')
  assert.equal(verifyGemfieldSignature(undefined, basePayload, signature), false, 'a missing secret fails closed')

  // Canonical message is order-stable and null-safe.
  assert.equal(
    canonicalGemfieldMessage({ gfId: 'GF-2026-0001', phase: 'design' }),
    'GF-2026-0001\ndesign\n\n\n\n\n',
    'canonical message pads omitted fields',
  )
}

function testPlanPurityAndValidation(): void {
  const project = { id: 'proj-1', organizationId: 'org-1', existingPhases: [] as string[] }
  const input = { phase: 'build', status: 'complete', note: 'x', at: '2026-07-01T00:00:00.000Z' }

  const planA = planGemfieldProgress(project, input)
  const planB = planGemfieldProgress(project, input)
  assert.deepEqual(planA, planB, 'planning is deterministic for the same input (idempotent)')
  assert.deepEqual(planA.milestoneWhere, { projectId: 'proj-1', phase: 'build' }, 'idempotency key is (projectId, phase)')
  assert.equal(planA.currentPhase, 'build', 'current phase reflects the reported phase')

  // Current phase is the furthest-along phase, not simply the latest reported.
  const laterKnown = planGemfieldProgress(
    { id: 'proj-1', organizationId: 'org-1', existingPhases: ['build'] },
    { phase: 'design', at: '2026-07-02T00:00:00.000Z' },
  )
  assert.equal(laterKnown.currentPhase, 'build', 'reporting an earlier phase does not regress current phase')

  // Staging link phase gating is a serialization concern; planning still records the milestone.
  assert.throws(() => planGemfieldProgress(project, { phase: 'not_a_phase' }), GemfieldValidationError, 'invalid phase throws')
}

// A minimal in-memory Prisma stand-in: enough to exercise the ingest path and prove that a
// replayed webhook upserts in place rather than creating a duplicate milestone.
function createMockDb(seedProject: { id: string; organizationId: string; gfId: string }) {
  const milestones = new Map<string, { phase: string; status: string; note: string | null; at: Date }>()
  const activities: unknown[] = []

  const currentMilestonePhases = () => [...milestones.values()].map((milestone) => ({ phase: milestone.phase }))
  const projectRecord = () => ({
    id: seedProject.id,
    organizationId: seedProject.organizationId,
    gemfieldMilestones: currentMilestonePhases(),
  })

  const tx = {
    gemfieldMilestone: {
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.projectId_phase.projectId}:${where.projectId_phase.phase}`
        const next = milestones.has(key)
          ? { ...milestones.get(key)!, ...update }
          : { phase: create.phase, status: create.status, note: create.note, at: create.at }
        milestones.set(key, next)
        return next
      },
    },
    clientProject: { update: async () => ({}) },
    clientActivity: { create: async ({ data }: any) => { activities.push(data); return data } },
  }

  const db: any = {
    clientProject: {
      findFirst: async () => projectRecord(),
      findUnique: async () => projectRecord(),
    },
    $transaction: async (fn: any) => fn(tx),
  }
  return { db, milestones, activities }
}

async function testIngestIdempotency(): Promise<void> {
  const { db, milestones, activities } = createMockDb({
    id: 'proj-1',
    organizationId: 'org-1',
    gfId: 'GF-2026-0147',
  })
  const service = new GemfieldService(db)
  const input = { gfId: 'GF-2026-0147', phase: 'build', status: 'complete', at: '2026-07-01T00:00:00.000Z' }

  const first = await service.ingestProgress(input)
  const second = await service.ingestProgress(input) // exact replay

  assert.equal(milestones.size, 1, 'replaying the same (gfId, phase) does not duplicate the milestone')
  assert.equal(first.currentPhase, 'build', 'first ingest sets current phase')
  assert.equal(second.currentPhase, 'build', 'replay keeps current phase stable')
  assert.equal(activities.length, 2, 'each accepted event still records an activity entry')

  // A later, earlier-in-sequence phase does not regress the current phase.
  const design = await service.ingestProgress({ gfId: 'GF-2026-0147', phase: 'design', at: '2026-07-02T00:00:00.000Z' })
  assert.equal(design.currentPhase, 'build', 'current phase stays at the furthest-along phase')
  assert.equal(milestones.size, 2, 'a distinct phase adds a new milestone')

  // An unknown GF-ID is rejected before any write.
  const empty = createMockDb({ id: 'p', organizationId: 'o', gfId: 'GF-2026-0001' })
  const strictService = new GemfieldService({
    ...empty.db,
    clientProject: { ...empty.db.clientProject, findFirst: async () => null },
  } as any)
  await assert.rejects(
    () => strictService.ingestProgress({ gfId: 'GF-2026-9999', phase: 'build' }),
    GemfieldValidationError,
    'an unknown GF-ID is rejected',
  )
}

async function run(): Promise<void> {
  testSignatureVerification()
  testPlanPurityAndValidation()
  await testIngestIdempotency()
}

run()
  .then(() => console.log('gemfield.webhook tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
