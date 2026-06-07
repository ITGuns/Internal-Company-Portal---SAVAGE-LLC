import type { PrismaClient } from '@prisma/client'
import {
  CLIENT_ACTIVITY_TYPES,
  createClientActivity,
} from './clients.activity'
import type {
  CreateClientOrganizationInput,
  UpdateClientOrganizationServiceTierInput,
  UpdateClientOrganizationStatusInput,
} from './clients.validation'

export class ClientOrganizationsService {
  constructor(private prisma: PrismaClient) {}

  async createOrganization(data: CreateClientOrganizationInput) {
    return this.prisma.clientOrganization.create({
      data: {
        name: data.name,
        slug: data.slug,
        websiteUrl: data.websiteUrl,
        websiteWorkType: data.websiteWorkType,
        tierId: data.tierId,
        notes: data.notes,
      },
      include: {
        tier: true,
        _count: {
          select: {
            memberships: true,
            projects: true,
            tickets: true,
            updates: true,
          },
        },
      },
    })
  }

  async updateOrganizationServiceTier(
    id: string,
    data: UpdateClientOrganizationServiceTierInput,
    actorId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.clientOrganization.findUnique({
        where: { id },
        select: {
          tierId: true,
          tier: {
            select: {
              name: true,
            },
          },
        },
      })

      const organization = await tx.clientOrganization.update({
        where: { id },
        data: {
          tierId: data.tierId,
        },
        include: {
          tier: true,
          _count: {
            select: {
              memberships: true,
              projects: true,
              tickets: true,
              updates: true,
            },
          },
        },
      })

      if (previous?.tierId !== organization.tierId) {
        await createClientActivity(tx, {
          organizationId: organization.id,
          actorId,
          type: CLIENT_ACTIVITY_TYPES.organizationServiceTierUpdated,
          subjectType: 'organization',
          subjectId: organization.id,
          visibility: 'internal',
          title: organization.tier
            ? `Service tier assigned: ${organization.tier.name}`
            : 'Service tier cleared',
          body: previous?.tier?.name
            ? `Previous tier: ${previous.tier.name}`
            : null,
          metadata: {
            previousTierId: previous?.tierId || null,
            previousTierName: previous?.tier?.name || null,
            tierId: organization.tierId || null,
            tierName: organization.tier?.name || null,
          },
        })
      }

      return organization
    })
  }

  async updateOrganizationStatus(id: string, data: UpdateClientOrganizationStatusInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.clientOrganization.findUnique({
        where: { id },
        select: { status: true },
      })

      const organization = await tx.clientOrganization.update({
        where: { id },
        data: {
          status: data.status,
        },
        include: {
          tier: true,
          _count: {
            select: {
              memberships: true,
              projects: true,
              tickets: true,
              updates: true,
            },
          },
        },
      })

      if (previous?.status !== data.status && (data.status === 'archived' || previous?.status === 'archived')) {
        await createClientActivity(tx, {
          organizationId: organization.id,
          actorId,
          type: data.status === 'archived'
            ? CLIENT_ACTIVITY_TYPES.organizationArchived
            : CLIENT_ACTIVITY_TYPES.organizationRestored,
          subjectType: 'organization',
          subjectId: organization.id,
          visibility: 'internal',
          title: data.status === 'archived'
            ? `Client archived: ${organization.name}`
            : `Client restored: ${organization.name}`,
          body: data.status === 'archived'
            ? 'Client access was archived and hidden from client users.'
            : 'Client access was restored for active client users.',
          metadata: {
            previousStatus: previous?.status || null,
            status: data.status,
          },
        })
      }

      return organization
    })
  }
}
