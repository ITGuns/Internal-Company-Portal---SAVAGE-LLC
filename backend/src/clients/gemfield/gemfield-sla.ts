// SLA math for the developer control panel. Pure + config-driven so it is unit-testable and the
// targets can move without code changes. The clock runs only in business hours and PAUSES while a
// ticket is Waiting on Client - a timer that punishes devs for client silence gets ignored.
//
// Business hours are interpreted in UTC here for determinism; a real timezone offset is a later
// refinement (config carries it when needed).

export interface BusinessHoursConfig {
  startHour: number // 0-24, UTC
  endHour: number
  workDays: number[] // getUTCDay values: 0=Sun .. 6=Sat; default Mon-Fri
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 9,
  endHour: 17,
  workDays: [1, 2, 3, 4, 5],
}

export interface SlaTargets {
  firstResponseMinutes: number
  resolutionMinutes: number
}

// Per service-tier targets (business minutes), keyed by lowercased tier name. `default` is the
// fallback. Config-driven - override these values (e.g. from #S config) without touching callers.
export const DEFAULT_SLA_TARGETS_BY_TIER: Record<string, SlaTargets> = {
  default: { firstResponseMinutes: 8 * 60, resolutionMinutes: 5 * 8 * 60 },
  premium: { firstResponseMinutes: 2 * 60, resolutionMinutes: 2 * 8 * 60 },
}

export function slaTargetsForTier(tierName: string | null | undefined): SlaTargets {
  const key = (tierName || '').trim().toLowerCase()
  return DEFAULT_SLA_TARGETS_BY_TIER[key] ?? DEFAULT_SLA_TARGETS_BY_TIER.default
}

function dayBoundary(reference: Date, hour: number): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), hour, 0, 0, 0))
}

/** Business minutes between two instants, counting only in-hours time on work days. */
export function businessMinutesBetween(
  start: Date,
  end: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS,
): number {
  if (end <= start) return 0
  let total = 0
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))

  while (cursor <= lastDay) {
    if (config.workDays.includes(cursor.getUTCDay())) {
      const windowStart = dayBoundary(cursor, config.startHour)
      const windowEnd = dayBoundary(cursor, config.endHour)
      const overlapStart = start > windowStart ? start : windowStart
      const overlapEnd = end < windowEnd ? end : windowEnd
      if (overlapEnd > overlapStart) {
        total += (overlapEnd.getTime() - overlapStart.getTime()) / 60000
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return Math.round(total)
}

export interface PausedInterval {
  from: Date
  to: Date
}

/** Business minutes elapsed since `start`, minus business minutes spent paused (Waiting on Client). */
export function businessMinutesElapsed(
  start: Date,
  now: Date,
  pauses: PausedInterval[] = [],
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS,
): number {
  const gross = businessMinutesBetween(start, now, config)
  let paused = 0
  for (const pause of pauses) {
    const from = pause.from > start ? pause.from : start
    const to = pause.to < now ? pause.to : now
    if (to > from) paused += businessMinutesBetween(from, to, config)
  }
  return Math.max(0, gross - paused)
}

export type SlaState = 'on_track' | 'due_soon' | 'breached' | 'met'

/** SLA state given elapsed vs target. `met` short-circuits (the milestone already happened). */
export function slaState(elapsedMinutes: number, targetMinutes: number, met = false): SlaState {
  if (met) return 'met'
  if (targetMinutes <= 0) return 'on_track'
  if (elapsedMinutes >= targetMinutes) return 'breached'
  if (elapsedMinutes >= targetMinutes * 0.8) return 'due_soon'
  return 'on_track'
}
