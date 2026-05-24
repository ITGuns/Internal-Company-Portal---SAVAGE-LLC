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
  }
}
