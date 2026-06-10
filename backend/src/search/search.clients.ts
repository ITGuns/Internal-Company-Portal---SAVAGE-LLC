import type { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import type { GlobalSearchAccess } from './search.access'
import type { GlobalSearchResult } from './search.types'
import { compact, organizationName, toDateLabel } from './search.utils'

function clientHref(access: GlobalSearchAccess, managementHref: string, clientHrefValue: string): string {
  return access.canSearchClientOperations ? managementHref : clientHrefValue
}

function clientVisibilityWhere(access: GlobalSearchAccess): Prisma.ClientOrganizationWhereInput {
  if (access.canSearchClientOperations) return {}
  if (access.clientOrganizationIds.length === 0) return { id: { in: [] } }

  return {
    id: { in: access.clientOrganizationIds },
    status: 'active',
  }
}

function clientRecordWhere(access: GlobalSearchAccess): Prisma.ClientTicketWhereInput {
  if (access.canSearchClientOperations) return {}
  if (access.clientOrganizationIds.length === 0) return { organizationId: { in: [] } }

  return {
    organizationId: { in: access.clientOrganizationIds },
  }
}

function clientVisibleRecordWhere(access: GlobalSearchAccess) {
  if (access.canSearchClientOperations) return {}
  if (access.clientOrganizationIds.length === 0) {
    return { organizationId: { in: [] } }
  }

  return {
    organizationId: { in: access.clientOrganizationIds },
    visibleToClient: true,
  }
}

export async function searchClientRecords(query: string, access: GlobalSearchAccess, limit: number): Promise<GlobalSearchResult[]> {
  const organizationWhere = clientVisibilityWhere(access)
  const recordWhere = clientRecordWhere(access)
  const visibleRecordWhere = clientVisibleRecordWhere(access)
  const management = access.canSearchClientOperations
  const ticketCommentVisibility = management ? {} : { visibility: { not: 'internal' } }

  const [
    organizations,
    projects,
    tickets,
    workItems,
    approvals,
    reports,
    resources,
    updates,
    assets,
    calendarItems,
    roadmapItems,
    activities,
  ] = await Promise.all([
    prisma.clientOrganization.findMany({
      where: {
        AND: [
          organizationWhere,
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
              { websiteUrl: { contains: query, mode: 'insensitive' } },
              ...(management ? [{ notes: { contains: query, mode: 'insensitive' as const } }] : []),
            ],
          },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientProject.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { summary: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
              ...(management ? [{ internalNotes: { contains: query, mode: 'insensitive' as const } }] : []),
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientTicket.findMany({
      where: {
        AND: [
          recordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              ...(management ? [{ internalNotes: { contains: query, mode: 'insensitive' as const } }] : []),
              {
                comments: {
                  some: {
                    AND: [
                      ticketCommentVisibility,
                      { body: { contains: query, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientWorkItem.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
              { priority: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientApproval.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { responseNote: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientReport.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { summary: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
              { followUpStatus: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientResourceLink.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { label: { contains: query, mode: 'insensitive' } },
              { type: { contains: query, mode: 'insensitive' } },
              { url: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientUpdate.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { body: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientAsset.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { label: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              { type: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientCalendarItem.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { channel: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientRoadmapRecommendation.findMany({
      where: {
        AND: [
          visibleRecordWhere,
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { body: { contains: query, mode: 'insensitive' } },
              { status: { contains: query, mode: 'insensitive' } },
              { priority: { contains: query, mode: 'insensitive' } },
              { impact: { contains: query, mode: 'insensitive' } },
              { effort: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.clientActivity.findMany({
      where: {
        AND: [
          access.canSearchClientOperations
            ? {}
            : {
                organizationId: { in: access.clientOrganizationIds },
                visibility: { not: 'internal' },
              },
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { body: { contains: query, mode: 'insensitive' } },
              { type: { contains: query, mode: 'insensitive' } },
              { subjectType: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return [
    ...organizations.map((organization): GlobalSearchResult => ({
      id: `client:${organization.id}`,
      type: 'client',
      title: organization.name,
      subtitle: compact([organization.status, organization.websiteUrl]),
      href: clientHref(access, `/operations/clients?client=${encodeURIComponent(organization.id)}`, '/client'),
      section: 'Clients',
    })),
    ...projects.map((project): GlobalSearchResult => ({
      id: `client-project:${project.id}`,
      type: 'client-project',
      title: project.name,
      subtitle: compact([organizationName(project), project.status]),
      href: clientHref(access, `/operations/clients/delivery?client=${encodeURIComponent(project.organizationId)}`, '/client/work'),
      section: 'Client Projects',
    })),
    ...tickets.map((ticket): GlobalSearchResult => ({
      id: `client-ticket:${ticket.id}`,
      type: 'client-ticket',
      title: ticket.title,
      subtitle: compact([organizationName(ticket), ticket.status, ticket.priority]),
      href: clientHref(access, `/operations/clients/requests?client=${encodeURIComponent(ticket.organizationId)}`, '/client/tickets'),
      section: 'Client Requests',
    })),
    ...workItems.map((item): GlobalSearchResult => ({
      id: `client-work:${item.id}`,
      type: 'client-work',
      title: item.title,
      subtitle: compact([organizationName(item), item.status, `${item.progress || 0}%`]),
      href: clientHref(access, `/operations/clients/delivery?client=${encodeURIComponent(item.organizationId)}`, '/client/work'),
      section: 'Client Work',
    })),
    ...approvals.map((approval): GlobalSearchResult => ({
      id: `client-approval:${approval.id}`,
      type: 'client-approval',
      title: approval.title,
      subtitle: compact([organizationName(approval), approval.status, approval.dueAt ? `Due ${toDateLabel(approval.dueAt)}` : '']),
      href: clientHref(access, `/operations/clients/approvals?client=${encodeURIComponent(approval.organizationId)}`, '/client/approvals'),
      section: 'Client Approvals',
    })),
    ...reports.map((report): GlobalSearchResult => ({
      id: `client-report:${report.id}`,
      type: 'client-report',
      title: report.title,
      subtitle: compact([organizationName(report), report.status, toDateLabel(report.periodEnd)]),
      href: clientHref(access, `/operations/clients/reports?client=${encodeURIComponent(report.organizationId)}`, '/client/reports'),
      section: 'Client Reports',
    })),
    ...resources.map((resource): GlobalSearchResult => ({
      id: `client-resource:${resource.id}`,
      type: 'client-resource',
      title: resource.label,
      subtitle: compact([organizationName(resource), resource.type]),
      href: clientHref(access, `/operations/clients/assets?client=${encodeURIComponent(resource.organizationId)}`, '/client/resources'),
      section: 'Client Resources',
    })),
    ...updates.map((update): GlobalSearchResult => ({
      id: `client-update:${update.id}`,
      type: 'client-update',
      title: update.title,
      subtitle: compact([organizationName(update), update.status, toDateLabel(update.createdAt)]),
      href: clientHref(access, `/operations/clients/delivery?client=${encodeURIComponent(update.organizationId)}`, '/client/work'),
      section: 'Client Updates',
    })),
    ...assets.map((asset): GlobalSearchResult => ({
      id: `client-asset:${asset.id}`,
      type: 'client-asset',
      title: asset.label,
      subtitle: compact([organizationName(asset), asset.type, asset.status]),
      href: clientHref(access, `/operations/clients/assets?client=${encodeURIComponent(asset.organizationId)}`, '/client/resources'),
      section: 'Client Assets',
    })),
    ...calendarItems.map((item): GlobalSearchResult => ({
      id: `client-calendar:${item.id}`,
      type: 'client-calendar',
      title: item.title,
      subtitle: compact([organizationName(item), item.status, toDateLabel(item.startAt)]),
      href: clientHref(access, `/operations/clients/calendar?client=${encodeURIComponent(item.organizationId)}`, '/client/calendar'),
      section: 'Client Calendar',
    })),
    ...roadmapItems.map((item): GlobalSearchResult => ({
      id: `client-roadmap:${item.id}`,
      type: 'client-roadmap',
      title: item.title,
      subtitle: compact([organizationName(item), item.status, item.priority]),
      href: clientHref(access, `/operations/clients/roadmap?client=${encodeURIComponent(item.organizationId)}`, '/client/work'),
      section: 'Client Roadmap',
    })),
    ...activities.map((activity): GlobalSearchResult => ({
      id: `client-activity:${activity.id}`,
      type: 'client-activity',
      title: activity.title,
      subtitle: compact([organizationName(activity), activity.subjectType, toDateLabel(activity.createdAt)]),
      href: clientHref(access, `/operations/clients?client=${encodeURIComponent(activity.organizationId)}`, '/client'),
      section: 'Client Activity',
    })),
  ]
}
