// Gemfield Bridge - build phase vocabulary.
//
// Deskii's Prisma schema uses zero enums by convention: every status/category is a
// String validated in application code. Phases follow that same pattern - an ordered
// array + a validation Set - NOT a Prisma enum. The order is meaningful (it drives the
// client timeline and the "show the staging link once we reach client_review" gating).
//
// This 9-phase sequence is defined here for the first time; no prior definition exists in
// either the Deskii or Gemfield repos. Adjust the list to change the vocabulary - callers
// derive everything (order, membership, comparisons) from GEMFIELD_PHASES.

export const GEMFIELD_PHASES = [
  'intake_received',
  'research',
  'blueprint',
  'design',
  'build',
  'qa',
  'client_review',
  'launch_prep',
  'live',
] as const

export type GemfieldPhase = (typeof GEMFIELD_PHASES)[number]

const GEMFIELD_PHASE_SET: ReadonlySet<string> = new Set(GEMFIELD_PHASES)

export function isGemfieldPhase(value: unknown): value is GemfieldPhase {
  return typeof value === 'string' && GEMFIELD_PHASE_SET.has(value)
}

/** Position of a phase in the sequence, or -1 for an unknown value. */
export function gemfieldPhaseIndex(value: unknown): number {
  if (typeof value !== 'string') return -1
  return GEMFIELD_PHASES.indexOf(value as GemfieldPhase)
}

/** True when `current` has reached or passed `target` in the sequence. */
export function isPhaseAtOrAfter(current: unknown, target: GemfieldPhase): boolean {
  const currentIndex = gemfieldPhaseIndex(current)
  if (currentIndex < 0) return false
  return currentIndex >= gemfieldPhaseIndex(target)
}

// Per-phase milestone status (mirrors the String+Set convention above).
export const GEMFIELD_MILESTONE_STATUSES = ['pending', 'in_progress', 'complete'] as const
export type GemfieldMilestoneStatus = (typeof GEMFIELD_MILESTONE_STATUSES)[number]

const GEMFIELD_MILESTONE_STATUS_SET: ReadonlySet<string> = new Set(GEMFIELD_MILESTONE_STATUSES)

export function isGemfieldMilestoneStatus(value: unknown): value is GemfieldMilestoneStatus {
  return typeof value === 'string' && GEMFIELD_MILESTONE_STATUS_SET.has(value)
}

// Phase at which the staging preview link becomes client-visible, and the live launch phase.
export const GEMFIELD_STAGING_VISIBLE_FROM: GemfieldPhase = 'client_review'
export const GEMFIELD_LIVE_PHASE: GemfieldPhase = 'live'

/** The furthest-along known phase (highest index). Null when no valid phases are given. */
export function furthestGemfieldPhase(phases: readonly string[]): GemfieldPhase | null {
  let best: GemfieldPhase | null = null
  let bestIndex = -1
  for (const phase of phases) {
    const index = gemfieldPhaseIndex(phase)
    if (index > bestIndex) {
      bestIndex = index
      best = GEMFIELD_PHASES[index]
    }
  }
  return best
}

// Warm, client-facing phase labels (no internal jargon). Keyed by phase; callers fall back
// to a title-cased slug for any phase not listed.
const GEMFIELD_PHASE_LABELS: Record<GemfieldPhase, string> = {
  intake_received: 'Project received',
  research: 'Researching your market',
  blueprint: 'Planning your site',
  design: 'Designing',
  build: 'Building',
  qa: 'Quality checks',
  client_review: 'Ready for your review',
  launch_prep: 'Preparing to launch',
  live: 'Live',
}

export function gemfieldPhaseLabel(phase: string): string {
  if (isGemfieldPhase(phase)) return GEMFIELD_PHASE_LABELS[phase]
  return phase.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}
