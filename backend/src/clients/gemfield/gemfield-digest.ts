import { OPEN_STATUSES } from './gemfield-pipeline'
import type { SlaState } from './gemfield-sla'

// Pure digest builder: summarize the open Gemfield pipeline for the daily dev notification.
// Kept Prisma-free so the summary logic is unit-testable.

export interface DigestPipelineItem {
  status: string
  ticketKind: string | null
  assignedToId: string | null
  sla: { firstResponse: SlaState; resolution: SlaState }
}

export interface GemfieldDigest {
  openCount: number
  byStatus: Record<string, number>
  devAssistCount: number
  unassignedOpenCount: number
  breachedCount: number
  title: string
  message: string
}

export function buildGemfieldDigest(items: DigestPipelineItem[]): GemfieldDigest {
  const open = items.filter((item) => OPEN_STATUSES.has(item.status))

  const byStatus: Record<string, number> = {}
  for (const item of open) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1
  }

  const devAssistCount = open.filter((item) => item.ticketKind === 'dev_assist').length
  const unassignedOpenCount = open.filter((item) => !item.assignedToId).length
  const breachedCount = open.filter(
    (item) => item.sla.firstResponse === 'breached' || item.sla.resolution === 'breached',
  ).length

  const title = `Gemfield: ${open.length} open request${open.length === 1 ? '' : 's'}`
  const parts = [
    `${open.length} open`,
    devAssistCount ? `${devAssistCount} dev-assist` : null,
    breachedCount ? `${breachedCount} SLA-breached` : null,
    unassignedOpenCount ? `${unassignedOpenCount} unassigned` : null,
  ].filter((part): part is string => Boolean(part))

  return {
    openCount: open.length,
    byStatus,
    devAssistCount,
    unassignedOpenCount,
    breachedCount,
    title,
    message: open.length ? parts.join(' · ') : 'No open requests right now.',
  }
}
