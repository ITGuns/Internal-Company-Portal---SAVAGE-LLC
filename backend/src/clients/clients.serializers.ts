type SerializableDate = Date | string | null | undefined

interface ClientServiceTierLike {
  id: string
  name: string
  description?: string | null
  [key: string]: unknown
}

interface ClientOrganizationLike {
  id: string
  name: string
  slug: string
  status: string
  websiteUrl?: string | null
  createdAt: SerializableDate
  updatedAt: SerializableDate
  tier?: ClientServiceTierLike | null
  _count?: Record<string, number>
  [key: string]: unknown
}

interface ClientMembershipLike {
  id: string
  organizationId: string
  userId: string
  role: string
  status: string
  createdAt: SerializableDate
  updatedAt?: SerializableDate
  user?: {
    id: string
    email: string
    name?: string | null
    avatar?: string | null
  } | null
  [key: string]: unknown
}

interface ClientProjectLike {
  id: string
  organizationId: string
  name: string
  status: string
  summary?: string | null
  progress: number
  startedAt?: SerializableDate
  targetLaunchAt?: SerializableDate
  liveUrl?: string | null
  previewUrl?: string | null
  internalNotes?: string | null
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientTicketCommentLike {
  id: string
  ticketId: string
  authorId?: string | null
  body: string
  visibility: string
  createdAt: SerializableDate
  updatedAt: SerializableDate
  author?: {
    id: string
    email: string
    name?: string | null
    avatar?: string | null
  } | null
  [key: string]: unknown
}

interface ClientTicketLike {
  id: string
  organizationId: string
  projectId?: string | null
  title: string
  description?: string | null
  category: string
  priority: string
  status: string
  createdAt: SerializableDate
  updatedAt: SerializableDate
  closedAt?: SerializableDate
  comments?: ClientTicketCommentLike[]
  [key: string]: unknown
}

interface ClientUpdateLike {
  id: string
  organizationId: string
  projectId?: string | null
  title: string
  body: string
  status: string
  visibleToClient: boolean
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientMetricSnapshotLike {
  id: string
  organizationId: string
  label: string
  value: string
  unit?: string | null
  periodStart?: SerializableDate
  periodEnd?: SerializableDate
  source: string
  notes?: string | null
  visibleToClient: boolean
  createdAt: SerializableDate
  [key: string]: unknown
}

interface ClientResourceLinkLike {
  id: string
  organizationId: string
  projectId?: string | null
  label: string
  url: string
  type: string
  visibleToClient: boolean
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientInvitedUserLike {
  id: string
  email: string
  name?: string | null
  avatar?: string | null
  status?: string | null
  isApproved?: boolean | null
  createdAt?: SerializableDate
  updatedAt?: SerializableDate
  [key: string]: unknown
}

interface ClientWorkItemLike {
  id: string
  organizationId: string
  projectId?: string | null
  title: string
  description?: string | null
  status: string
  priority: string
  progress: number
  dueAt?: SerializableDate
  completedAt?: SerializableDate
  visibleToClient: boolean
  sortOrder: number
  assignedToId?: string | null
  createdById?: string | null
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientApprovalLike {
  id: string
  organizationId: string
  projectId?: string | null
  title: string
  description?: string | null
  status: string
  responseNote?: string | null
  requestedById?: string | null
  decidedById?: string | null
  dueAt?: SerializableDate
  decidedAt?: SerializableDate
  visibleToClient: boolean
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientReportLike {
  id: string
  organizationId: string
  title: string
  summary?: string | null
  periodStart: SerializableDate
  periodEnd: SerializableDate
  status: string
  visibleToClient: boolean
  leadsCaptured?: number | null
  missedOpportunities?: number | null
  followUpStatus?: string | null
  leadSourceBreakdown?: unknown
  reputationSnapshot?: unknown
  localVisibilitySnapshot?: unknown
  createdById?: string | null
  publishedAt?: SerializableDate
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientRoadmapRecommendationLike {
  id: string
  organizationId: string
  title: string
  body: string
  priority: string
  status: string
  impact?: string | null
  effort?: string | null
  visibleToClient: boolean
  sortOrder: number
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientAssetLike {
  id: string
  organizationId: string
  projectId?: string | null
  label: string
  url: string
  type: string
  status: string
  notes?: string | null
  visibleToClient: boolean
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientBillingStatusLike {
  id: string
  organizationId: string
  planName?: string | null
  status: string
  monthlyAmount?: number | null
  currency: string
  renewalAt?: SerializableDate
  notes?: string | null
  visibleToClient: boolean
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

interface ClientCalendarItemLike {
  id: string
  organizationId: string
  projectId?: string | null
  title: string
  description?: string | null
  channel?: string | null
  status: string
  startAt: SerializableDate
  endAt?: SerializableDate
  visibleToClient: boolean
  createdById?: string | null
  createdAt: SerializableDate
  updatedAt: SerializableDate
  [key: string]: unknown
}

function serializeDate(value: SerializableDate): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function serializeClientOrganizationForClient(organization: ClientOrganizationLike) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    websiteUrl: organization.websiteUrl || null,
    createdAt: serializeDate(organization.createdAt),
    updatedAt: serializeDate(organization.updatedAt),
    tier: organization.tier
      ? {
        id: organization.tier.id,
        name: organization.tier.name,
        description: organization.tier.description || null,
      }
      : null,
  }
}

export function serializeClientOrganizationForManagement(organization: ClientOrganizationLike) {
  return {
    ...serializeClientOrganizationForClient(organization),
    tierId: typeof organization.tierId === 'string' ? organization.tierId : null,
    notes: typeof organization.notes === 'string' ? organization.notes : null,
    tier: organization.tier
      ? {
        id: organization.tier.id,
        name: organization.tier.name,
        description: organization.tier.description || null,
        monthlyPrice: typeof organization.tier.monthlyPrice === 'number' ? organization.tier.monthlyPrice : null,
        priorityRank: typeof organization.tier.priorityRank === 'number' ? organization.tier.priorityRank : 0,
      }
      : null,
    counts: organization._count || undefined,
  }
}

export function serializeClientMembershipForManagement(membership: ClientMembershipLike) {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    createdAt: serializeDate(membership.createdAt),
    updatedAt: serializeDate(membership.updatedAt),
    user: membership.user
      ? {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name || null,
        avatar: membership.user.avatar || null,
      }
      : null,
  }
}

export function serializeClientProjectForClient(project: ClientProjectLike) {
  return {
    id: project.id,
    organizationId: project.organizationId,
    name: project.name,
    status: project.status,
    summary: project.summary || null,
    progress: project.progress,
    startedAt: serializeDate(project.startedAt),
    targetLaunchAt: serializeDate(project.targetLaunchAt),
    liveUrl: project.liveUrl || null,
    previewUrl: project.previewUrl || null,
    createdAt: serializeDate(project.createdAt),
    updatedAt: serializeDate(project.updatedAt),
  }
}

export function serializeClientProjectForManagement(project: ClientProjectLike) {
  return {
    ...serializeClientProjectForClient(project),
    internalNotes: project.internalNotes || null,
  }
}

export function serializeClientTicketForClient(ticket: ClientTicketLike) {
  return {
    id: ticket.id,
    organizationId: ticket.organizationId,
    projectId: ticket.projectId || null,
    title: ticket.title,
    description: ticket.description || null,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: serializeDate(ticket.createdAt),
    updatedAt: serializeDate(ticket.updatedAt),
    closedAt: serializeDate(ticket.closedAt),
    comments: ticket.comments
      ?.filter((comment) => comment.visibility !== 'internal')
      .map((comment) => ({
        id: comment.id,
        ticketId: comment.ticketId,
        authorId: comment.authorId || null,
        author: comment.author
          ? {
            id: comment.author.id,
            email: comment.author.email,
            name: comment.author.name || null,
            avatar: comment.author.avatar || null,
          }
          : null,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: serializeDate(comment.createdAt),
        updatedAt: serializeDate(comment.updatedAt),
      })),
  }
}

export function serializeClientTicketForManagement(ticket: ClientTicketLike) {
  return {
    ...serializeClientTicketForClient(ticket),
    internalNotes: typeof ticket.internalNotes === 'string' ? ticket.internalNotes : null,
    createdById: typeof ticket.createdById === 'string' ? ticket.createdById : null,
    assignedToId: typeof ticket.assignedToId === 'string' ? ticket.assignedToId : null,
    comments: ticket.comments?.map((comment) => ({
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.authorId || null,
      author: comment.author
        ? {
          id: comment.author.id,
          email: comment.author.email,
          name: comment.author.name || null,
          avatar: comment.author.avatar || null,
        }
        : null,
      body: comment.body,
      visibility: comment.visibility,
      createdAt: serializeDate(comment.createdAt),
      updatedAt: serializeDate(comment.updatedAt),
    })),
  }
}

export function serializeClientUpdateForClient(update: ClientUpdateLike) {
  if (!update.visibleToClient || update.status !== 'published') return null

  return {
    id: update.id,
    organizationId: update.organizationId,
    projectId: update.projectId || null,
    title: update.title,
    body: update.body,
    status: update.status,
    createdAt: serializeDate(update.createdAt),
    updatedAt: serializeDate(update.updatedAt),
  }
}

export function serializeClientUpdateForManagement(update: ClientUpdateLike) {
  return {
    id: update.id,
    organizationId: update.organizationId,
    projectId: update.projectId || null,
    title: update.title,
    body: update.body,
    status: update.status,
    visibleToClient: update.visibleToClient,
    createdAt: serializeDate(update.createdAt),
    updatedAt: serializeDate(update.updatedAt),
  }
}

export function serializeClientMetricSnapshotForClient(metric: ClientMetricSnapshotLike) {
  if (!metric.visibleToClient) return null

  return {
    id: metric.id,
    organizationId: metric.organizationId,
    label: metric.label,
    value: metric.value,
    unit: metric.unit || null,
    periodStart: serializeDate(metric.periodStart),
    periodEnd: serializeDate(metric.periodEnd),
    createdAt: serializeDate(metric.createdAt),
  }
}

export function serializeClientMetricSnapshotForManagement(metric: ClientMetricSnapshotLike) {
  return {
    ...serializeClientMetricSnapshotForClient({ ...metric, visibleToClient: true }),
    source: metric.source,
    notes: metric.notes || null,
    visibleToClient: metric.visibleToClient,
  }
}

export function serializeClientResourceLinkForClient(resource: ClientResourceLinkLike) {
  if (!resource.visibleToClient) return null

  return {
    id: resource.id,
    organizationId: resource.organizationId,
    projectId: resource.projectId || null,
    label: resource.label,
    url: resource.url,
    type: resource.type,
    createdAt: serializeDate(resource.createdAt),
    updatedAt: serializeDate(resource.updatedAt),
  }
}

export function serializeClientResourceLinkForManagement(resource: ClientResourceLinkLike) {
  return {
    ...serializeClientResourceLinkForClient({ ...resource, visibleToClient: true }),
    visibleToClient: resource.visibleToClient,
  }
}

export function serializeClientMembershipForClient(membership: ClientMembershipLike) {
  if (membership.status !== 'active') return null

  return {
    id: membership.id,
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    user: membership.user
      ? {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name || null,
        avatar: membership.user.avatar || null,
      }
      : null,
  }
}

export function serializeClientInvitedUserForManagement(user: ClientInvitedUserLike) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    avatar: user.avatar || null,
    status: user.status || null,
    isApproved: Boolean(user.isApproved),
    role: 'client',
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
  }
}


export function serializeClientWorkItemForClient(item: ClientWorkItemLike) {
  if (!item.visibleToClient) return null

  return {
    id: item.id,
    organizationId: item.organizationId,
    projectId: item.projectId || null,
    title: item.title,
    description: item.description || null,
    status: item.status,
    priority: item.priority,
    progress: item.progress,
    dueAt: serializeDate(item.dueAt),
    completedAt: serializeDate(item.completedAt),
    visibleToClient: item.visibleToClient,
    sortOrder: item.sortOrder,
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
  }
}

export function serializeClientWorkItemForManagement(item: ClientWorkItemLike) {
  return {
    ...serializeClientWorkItemForClient({ ...item, visibleToClient: true }),
    assignedToId: item.assignedToId || null,
    createdById: item.createdById || null,
    visibleToClient: item.visibleToClient,
  }
}

export function serializeClientApprovalForClient(approval: ClientApprovalLike) {
  if (!approval.visibleToClient) return null

  return {
    id: approval.id,
    organizationId: approval.organizationId,
    projectId: approval.projectId || null,
    title: approval.title,
    description: approval.description || null,
    status: approval.status,
    responseNote: approval.responseNote || null,
    dueAt: serializeDate(approval.dueAt),
    decidedAt: serializeDate(approval.decidedAt),
    visibleToClient: approval.visibleToClient,
    createdAt: serializeDate(approval.createdAt),
    updatedAt: serializeDate(approval.updatedAt),
  }
}

export function serializeClientApprovalForManagement(approval: ClientApprovalLike) {
  return {
    ...serializeClientApprovalForClient({ ...approval, visibleToClient: true }),
    responseNote: approval.responseNote || null,
    requestedById: approval.requestedById || null,
    decidedById: approval.decidedById || null,
    visibleToClient: approval.visibleToClient,
  }
}

export function serializeClientReportForClient(report: ClientReportLike) {
  if (!report.visibleToClient || report.status !== 'published') return null

  return {
    id: report.id,
    organizationId: report.organizationId,
    title: report.title,
    summary: report.summary || null,
    periodStart: serializeDate(report.periodStart),
    periodEnd: serializeDate(report.periodEnd),
    status: report.status,
    visibleToClient: report.visibleToClient,
    leadsCaptured: report.leadsCaptured ?? null,
    missedOpportunities: report.missedOpportunities ?? null,
    followUpStatus: report.followUpStatus || null,
    leadSourceBreakdown: report.leadSourceBreakdown ?? null,
    reputationSnapshot: report.reputationSnapshot ?? null,
    localVisibilitySnapshot: report.localVisibilitySnapshot ?? null,
    publishedAt: serializeDate(report.publishedAt),
    createdAt: serializeDate(report.createdAt),
    updatedAt: serializeDate(report.updatedAt),
  }
}

export function serializeClientReportForManagement(report: ClientReportLike) {
  return {
    ...serializeClientReportForClient({ ...report, visibleToClient: true, status: 'published' }),
    status: report.status,
    createdById: report.createdById || null,
    visibleToClient: report.visibleToClient,
  }
}

export function serializeClientRoadmapRecommendationForClient(roadmap: ClientRoadmapRecommendationLike) {
  if (!roadmap.visibleToClient) return null

  return {
    id: roadmap.id,
    organizationId: roadmap.organizationId,
    title: roadmap.title,
    body: roadmap.body,
    priority: roadmap.priority,
    status: roadmap.status,
    impact: roadmap.impact || null,
    effort: roadmap.effort || null,
    visibleToClient: roadmap.visibleToClient,
    sortOrder: roadmap.sortOrder,
    createdAt: serializeDate(roadmap.createdAt),
    updatedAt: serializeDate(roadmap.updatedAt),
  }
}

export function serializeClientRoadmapRecommendationForManagement(roadmap: ClientRoadmapRecommendationLike) {
  return {
    ...serializeClientRoadmapRecommendationForClient({ ...roadmap, visibleToClient: true }),
    visibleToClient: roadmap.visibleToClient,
  }
}

export function serializeClientAssetForClient(asset: ClientAssetLike) {
  if (!asset.visibleToClient) return null

  return {
    id: asset.id,
    organizationId: asset.organizationId,
    projectId: asset.projectId || null,
    label: asset.label,
    url: asset.url,
    type: asset.type,
    status: asset.status,
    visibleToClient: asset.visibleToClient,
    createdAt: serializeDate(asset.createdAt),
    updatedAt: serializeDate(asset.updatedAt),
  }
}

export function serializeClientAssetForManagement(asset: ClientAssetLike) {
  return {
    ...serializeClientAssetForClient({ ...asset, visibleToClient: true }),
    notes: asset.notes || null,
    visibleToClient: asset.visibleToClient,
  }
}

export function serializeClientBillingStatusForClient(billing: ClientBillingStatusLike) {
  if (!billing.visibleToClient) return null

  return {
    id: billing.id,
    organizationId: billing.organizationId,
    planName: billing.planName || null,
    status: billing.status,
    monthlyAmount: billing.monthlyAmount ?? null,
    currency: billing.currency,
    renewalAt: serializeDate(billing.renewalAt),
    visibleToClient: billing.visibleToClient,
    createdAt: serializeDate(billing.createdAt),
    updatedAt: serializeDate(billing.updatedAt),
  }
}

export function serializeClientBillingStatusForManagement(billing: ClientBillingStatusLike) {
  return {
    ...serializeClientBillingStatusForClient({ ...billing, visibleToClient: true }),
    notes: billing.notes || null,
    visibleToClient: billing.visibleToClient,
  }
}

export function serializeClientCalendarItemForClient(item: ClientCalendarItemLike) {
  if (!item.visibleToClient) return null

  return {
    id: item.id,
    organizationId: item.organizationId,
    projectId: item.projectId || null,
    title: item.title,
    description: item.description || null,
    channel: item.channel || null,
    status: item.status,
    startAt: serializeDate(item.startAt),
    endAt: serializeDate(item.endAt),
    visibleToClient: item.visibleToClient,
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
  }
}

export function serializeClientCalendarItemForManagement(item: ClientCalendarItemLike) {
  return {
    ...serializeClientCalendarItemForClient({ ...item, visibleToClient: true }),
    createdById: item.createdById || null,
    visibleToClient: item.visibleToClient,
  }
}

export function serializeClientPortalOverview(organization: any, isPrivileged: boolean) {
  const serializeNullable = <T>(items: T[], serializer: (item: T) => unknown) =>
    items.map(serializer).filter(Boolean)

  return {
    organization: isPrivileged
      ? serializeClientOrganizationForManagement(organization)
      : serializeClientOrganizationForClient(organization),
    projects: (organization.projects || []).map((project: ClientProjectLike) =>
      isPrivileged ? serializeClientProjectForManagement(project) : serializeClientProjectForClient(project),
    ),
    tickets: (organization.tickets || []).map((ticket: ClientTicketLike) =>
      isPrivileged ? serializeClientTicketForManagement(ticket) : serializeClientTicketForClient(ticket),
    ),
    updates: isPrivileged
      ? (organization.updates || []).map(serializeClientUpdateForManagement)
      : serializeNullable(organization.updates || [], serializeClientUpdateForClient),
    metrics: isPrivileged
      ? (organization.metricSnapshots || []).map(serializeClientMetricSnapshotForManagement)
      : serializeNullable(organization.metricSnapshots || [], serializeClientMetricSnapshotForClient),
    resources: isPrivileged
      ? (organization.resourceLinks || []).map(serializeClientResourceLinkForManagement)
      : serializeNullable(organization.resourceLinks || [], serializeClientResourceLinkForClient),
    memberships: isPrivileged
      ? (organization.memberships || []).map(serializeClientMembershipForManagement)
      : serializeNullable(organization.memberships || [], serializeClientMembershipForClient),
    workItems: isPrivileged
      ? (organization.workItems || []).map(serializeClientWorkItemForManagement)
      : serializeNullable(organization.workItems || [], serializeClientWorkItemForClient),
    approvals: isPrivileged
      ? (organization.approvals || []).map(serializeClientApprovalForManagement)
      : serializeNullable(organization.approvals || [], serializeClientApprovalForClient),
    reports: isPrivileged
      ? (organization.reports || []).map(serializeClientReportForManagement)
      : serializeNullable(organization.reports || [], serializeClientReportForClient),
    roadmapRecommendations: isPrivileged
      ? (organization.roadmapRecommendations || []).map(serializeClientRoadmapRecommendationForManagement)
      : serializeNullable(organization.roadmapRecommendations || [], serializeClientRoadmapRecommendationForClient),
    assets: isPrivileged
      ? (organization.assets || []).map(serializeClientAssetForManagement)
      : serializeNullable(organization.assets || [], serializeClientAssetForClient),
    billingStatus: organization.billingStatus
      ? isPrivileged
        ? serializeClientBillingStatusForManagement(organization.billingStatus)
        : serializeClientBillingStatusForClient(organization.billingStatus)
      : null,
    calendarItems: isPrivileged
      ? (organization.calendarItems || []).map(serializeClientCalendarItemForManagement)
      : serializeNullable(organization.calendarItems || [], serializeClientCalendarItemForClient),
  }
}
