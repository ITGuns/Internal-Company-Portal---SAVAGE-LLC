import type { PrismaClient } from '@prisma/client'
import {
  ClientValidationError,
  type CreateClientMetricSnapshotInput,
  type CreateClientProjectInput,
  type CreateClientResourceLinkInput,
  type CreateClientUpdateInput,
  type UpdateClientProjectInput,
  type UpdateClientResourceLinkInput,
} from './clients.validation'

export class ClientContentService {
  constructor(private prisma: PrismaClient) {}

  async createProject(organizationId: string, data: CreateClientProjectInput) {
    return this.prisma.clientProject.create({
      data: {
        organizationId,
        name: data.name,
        status: data.status,
        summary: data.summary,
        progress: data.progress,
        startedAt: data.startedAt,
        targetLaunchAt: data.targetLaunchAt,
        liveUrl: data.liveUrl,
        previewUrl: data.previewUrl,
        internalNotes: data.internalNotes,
      },
    })
  }

  async findProjectById(id: string) {
    return this.prisma.clientProject.findUnique({
      where: { id },
    })
  }

  async updateProject(id: string, data: UpdateClientProjectInput) {
    return this.prisma.clientProject.update({
      where: { id },
      data,
    })
  }

  async createUpdate(organizationId: string, createdById: string, data: CreateClientUpdateInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientUpdate.create({
      data: {
        organizationId,
        projectId: data.projectId,
        title: data.title,
        body: data.body,
        status: data.status,
        visibleToClient: data.visibleToClient,
        createdById,
      },
    })
  }

  async createMetricSnapshot(organizationId: string, data: CreateClientMetricSnapshotInput) {
    return this.prisma.clientMetricSnapshot.create({
      data: {
        organizationId,
        label: data.label,
        value: data.value,
        unit: data.unit,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        source: data.source,
        notes: data.notes,
        visibleToClient: data.visibleToClient,
      },
    })
  }

  async createResourceLink(organizationId: string, data: CreateClientResourceLinkInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientResourceLink.create({
      data: {
        organizationId,
        projectId: data.projectId,
        label: data.label,
        url: data.url,
        type: data.type,
        visibleToClient: data.visibleToClient,
        createdById: data.createdById,
      },
    })
  }

  async findResourceLinkById(id: string) {
    return this.prisma.clientResourceLink.findUnique({
      where: { id },
    })
  }

  async updateResourceLink(resourceId: string, organizationId: string, data: UpdateClientResourceLinkInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientResourceLink.update({
      where: { id: resourceId },
      data,
    })
  }

  async deleteResourceLink(resourceId: string) {
    return this.prisma.clientResourceLink.delete({
      where: { id: resourceId },
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
