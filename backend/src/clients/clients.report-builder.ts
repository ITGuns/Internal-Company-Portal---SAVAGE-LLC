interface ReportMetricSource {
  label: string
  value: string
  unit?: string | null
  source?: string | null
}

interface ReportSourceItem {
  title: string
  description?: string | null
  status?: string | null
}

export interface ClientReportDraftSources {
  periodStart: Date
  periodEnd: Date
  title?: string
  visibleToClient: boolean
  completedWorkItems: ReportSourceItem[]
  closedTickets: ReportSourceItem[]
  publishedUpdates: ReportSourceItem[]
  metricSnapshots: ReportMetricSource[]
  approvals: ReportSourceItem[]
  roadmapRecommendations: ReportSourceItem[]
  calendarItems: ReportSourceItem[]
  openTickets: ReportSourceItem[]
  openApprovals: ReportSourceItem[]
}

export interface ClientReportDraftData {
  title: string
  summary: string
  periodStart: Date
  periodEnd: Date
  status: 'draft'
  visibleToClient: boolean
  leadsCaptured?: number
  missedOpportunities?: number
  followUpStatus?: string
  leadSourceBreakdown?: Record<string, number>
  reputationSnapshot?: Record<string, string>
  localVisibilitySnapshot?: Record<string, string>
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function normalizeMetricKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function readNumericMetric(metric: ReportMetricSource): number | null {
  const numeric = Number(String(metric.value).replace(/,/g, '').trim())
  return Number.isFinite(numeric) ? numeric : null
}

function metricText(metric: ReportMetricSource): string {
  return `${metric.label} ${metric.source || ''}`.toLowerCase()
}

function isLeadMetric(metric: ReportMetricSource): boolean {
  const text = metricText(metric)
  return /\bleads?\b|lead_capture|form_submission|phone_call|calls?/.test(text) && !isMissedOpportunityMetric(metric)
}

function isMissedOpportunityMetric(metric: ReportMetricSource): boolean {
  return /missed|lost|unanswered|opportunit/.test(metricText(metric))
}

function isReputationMetric(metric: ReportMetricSource): boolean {
  return !isMissedOpportunityMetric(metric) && /review|rating|reputation/.test(metricText(metric))
}

function isLocalVisibilityMetric(metric: ReportMetricSource): boolean {
  return /local|maps?|ranking|visibility|gbp|google_business/.test(metricText(metric)) && !isReputationMetric(metric)
}

function formatPeriodLabel(periodStart: Date): string {
  return MONTH_FORMATTER.format(periodStart)
}

function formatTitles(items: ReportSourceItem[], limit = 4): string {
  return items.slice(0, limit).map((item) => item.title).join('; ')
}

function buildFollowUpStatus(openTickets: ReportSourceItem[], openApprovals: ReportSourceItem[]): string {
  const parts: string[] = []
  if (openTickets.length > 0) parts.push(`${openTickets.length} open request${openTickets.length === 1 ? '' : 's'}`)
  if (openApprovals.length > 0) parts.push(`${openApprovals.length} approval${openApprovals.length === 1 ? '' : 's'} awaiting decision`)
  return parts.length > 0 ? parts.join(', ') : 'All tracked requests and approvals are closed.'
}

export function buildClientReportDraftData(sources: ClientReportDraftSources): ClientReportDraftData {
  const leadSourceBreakdown: Record<string, number> = {}
  const reputationSnapshot: Record<string, string> = {}
  const localVisibilitySnapshot: Record<string, string> = {}
  let leadsCaptured = 0
  let missedOpportunities = 0

  for (const metric of sources.metricSnapshots) {
    const numericValue = readNumericMetric(metric)
    if (isLeadMetric(metric) && numericValue !== null) {
      leadsCaptured += numericValue
      const sourceKey = normalizeMetricKey(metric.source || metric.label)
      leadSourceBreakdown[sourceKey] = (leadSourceBreakdown[sourceKey] || 0) + numericValue
    }
    if (isMissedOpportunityMetric(metric) && numericValue !== null) {
      missedOpportunities += numericValue
    }
    if (isReputationMetric(metric)) {
      reputationSnapshot[normalizeMetricKey(metric.label)] = metric.value
    }
    if (isLocalVisibilityMetric(metric)) {
      localVisibilitySnapshot[normalizeMetricKey(metric.label)] = metric.value
    }
  }

  const summaryLines = [
    `Draft generated from Deskii activity for ${formatPeriodLabel(sources.periodStart)}.`,
  ]

  if (sources.completedWorkItems.length > 0) {
    summaryLines.push(`Completed work: ${formatTitles(sources.completedWorkItems)}.`)
  }
  if (sources.closedTickets.length > 0) {
    summaryLines.push(`Resolved client requests: ${formatTitles(sources.closedTickets)}.`)
  }
  if (sources.publishedUpdates.length > 0) {
    summaryLines.push(`Client updates posted: ${formatTitles(sources.publishedUpdates)}.`)
  }
  if (sources.approvals.length > 0) {
    summaryLines.push(`Approval activity: ${formatTitles(sources.approvals)}.`)
  }
  if (sources.roadmapRecommendations.length > 0) {
    summaryLines.push(`Recommended next steps: ${formatTitles(sources.roadmapRecommendations)}.`)
  }
  if (sources.calendarItems.length > 0) {
    summaryLines.push(`Calendar activity: ${formatTitles(sources.calendarItems)}.`)
  }
  if (summaryLines.length === 1) {
    summaryLines.push('No client-visible activity was found for this period yet.')
  }

  return {
    title: sources.title || `${formatPeriodLabel(sources.periodStart)} Client Report`,
    summary: summaryLines.join('\n'),
    periodStart: sources.periodStart,
    periodEnd: sources.periodEnd,
    status: 'draft',
    visibleToClient: sources.visibleToClient,
    ...(leadsCaptured > 0 ? { leadsCaptured } : {}),
    ...(missedOpportunities > 0 ? { missedOpportunities } : {}),
    followUpStatus: buildFollowUpStatus(sources.openTickets, sources.openApprovals),
    ...(Object.keys(leadSourceBreakdown).length > 0 ? { leadSourceBreakdown } : {}),
    ...(Object.keys(reputationSnapshot).length > 0 ? { reputationSnapshot } : {}),
    ...(Object.keys(localVisibilitySnapshot).length > 0 ? { localVisibilitySnapshot } : {}),
  }
}
