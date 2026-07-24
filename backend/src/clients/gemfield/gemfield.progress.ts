import { CLIENT_ACTIVITY_TYPES, type CreateClientActivityInput } from '../clients.activity'
import { isValidGfId, normalizeGfId } from './gemfield.access'
import {
  furthestGemfieldPhase,
  gemfieldPhaseLabel,
  isGemfieldMilestoneStatus,
  isGemfieldPhase,
} from './gemfield.phases'

// Pure planning for a progress event. Kept free of Prisma so it is deterministic and unit-testable:
// given the same input and the same existing phases it always produces the same plan, which is what
// makes the webhook idempotent (the milestone key is (projectId, phase), so a replay upserts in place).

export class GemfieldValidationError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message)
    this.name = 'GemfieldValidationError'
  }
}

export interface GemfieldProgressInput {
  gfId?: string
  phase: string
  status?: string | null
  note?: string | null
  stagingUrl?: string | null
  liveUrl?: string | null
  at?: string | null
  actorId?: string | null
}

export interface GemfieldProjectContext {
  id: string
  organizationId: string
  existingPhases: string[]
}

export interface GemfieldProgressPlan {
  milestoneWhere: { projectId: string; phase: string }
  milestoneStatus: string
  milestoneNote: string | null
  milestoneAt: Date
  currentPhase: string
  projectUpdates: { gemfieldPhase: string; stagingUrl?: string; liveUrl?: string }
  activity: CreateClientActivityInput
}

/** Validate + normalize a GF-ID (throws 422 on a malformed id). */
export function validateGfId(gfId: string): string {
  if (!isValidGfId(gfId)) throw new GemfieldValidationError('invalid_gfId')
  return normalizeGfId(gfId)
}

function parseAt(at?: string | null): Date {
  if (typeof at === 'string') {
    const parsed = new Date(at)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export function planGemfieldProgress(
  project: GemfieldProjectContext,
  input: GemfieldProgressInput,
): GemfieldProgressPlan {
  if (!isGemfieldPhase(input.phase)) throw new GemfieldValidationError('invalid_phase')

  const milestoneStatus =
    input.status && isGemfieldMilestoneStatus(input.status) ? input.status : 'complete'

  // The furthest-along phase across everything known so far (existing milestones + this one).
  const phases = new Set(project.existingPhases.filter(isGemfieldPhase))
  phases.add(input.phase)
  const currentPhase = furthestGemfieldPhase([...phases]) ?? input.phase

  const projectUpdates: GemfieldProgressPlan['projectUpdates'] = { gemfieldPhase: currentPhase }
  if (typeof input.stagingUrl === 'string' && input.stagingUrl.trim()) {
    projectUpdates.stagingUrl = input.stagingUrl.trim()
  }
  if (typeof input.liveUrl === 'string' && input.liveUrl.trim()) {
    projectUpdates.liveUrl = input.liveUrl.trim()
  }

  const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : null

  return {
    milestoneWhere: { projectId: project.id, phase: input.phase },
    milestoneStatus,
    milestoneNote: note,
    milestoneAt: parseAt(input.at),
    currentPhase,
    projectUpdates,
    activity: {
      organizationId: project.organizationId,
      actorId: input.actorId ?? null,
      type: CLIENT_ACTIVITY_TYPES.gemfieldPhaseAdvanced,
      subjectType: 'gemfield_project',
      subjectId: project.id,
      visibility: 'client',
      title: `Build update: ${gemfieldPhaseLabel(input.phase)}`,
      body: note,
      metadata: { phase: input.phase, status: milestoneStatus, currentPhase },
    },
  }
}
