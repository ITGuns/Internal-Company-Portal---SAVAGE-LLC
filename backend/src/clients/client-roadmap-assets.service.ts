import type { PrismaClient } from '@prisma/client'
import {
  ClientValidationError,
  type CreateClientAssetInput,
  type CreateClientRoadmapRecommendationInput,
  type UpdateClientAssetInput,
  type UpdateClientRoadmapRecommendationInput,
} from './clients.validation'

export class ClientRoadmapAssetsService {
  constructor(private prisma: PrismaClient) {}

  async createRoadmapRecommendation(organizationId: string, data: CreateClientRoadmapRecommendationInput) {
    return this.prisma.clientRoadmapRecommendation.create({
      data: {
        organizationId,
        title: data.title,
        body: data.body,
        priority: data.priority,
        status: data.status,
        impact: data.impact,
        effort: data.effort,
        visibleToClient: data.visibleToClient,
        sortOrder: data.sortOrder,
      },
    })
  }

  async findRoadmapRecommendationById(id: string) {
    return this.prisma.clientRoadmapRecommendation.findUnique({ where: { id } })
  }

  async updateRoadmapRecommendation(id: string, data: UpdateClientRoadmapRecommendationInput) {
    return this.prisma.clientRoadmapRecommendation.update({
      where: { id },
      data,
    })
  }

  async createAsset(organizationId: string, data: CreateClientAssetInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const existingAsset = await tx.clientAsset.findFirst({
        where: {
          organizationId,
          projectId: data.projectId || null,
          label: data.label,
          url: data.url,
          type: data.type,
        },
        orderBy: { updatedAt: 'desc' },
      })

      if (existingAsset) {
        return tx.clientAsset.update({
          where: { id: existingAsset.id },
          data: {
            status: data.status,
            notes: data.notes,
            visibleToClient: data.visibleToClient,
          },
        })
      }

      return tx.clientAsset.create({
        data: {
          organizationId,
          projectId: data.projectId,
          label: data.label,
          url: data.url,
          type: data.type,
          status: data.status,
          notes: data.notes,
          visibleToClient: data.visibleToClient,
        },
      })
    })
  }

  async findAssetById(id: string) {
    return this.prisma.clientAsset.findUnique({ where: { id } })
  }

  async updateAsset(id: string, organizationId: string, data: UpdateClientAssetInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientAsset.update({
      where: { id },
      data,
    })
  }

  private async assertProjectBelongsToOrganization(organizationId: string, projectId?: string | null) {
    if (!projectId) return

    const project = await this.prisma.clientProject.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: { id: true },
    })

    if (!project) {
      throw new ClientValidationError('Project does not belong to this client organization')
    }
  }
}
