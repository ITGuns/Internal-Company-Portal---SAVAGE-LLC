import type { PrismaClient } from '@prisma/client'
import type {
  CreateClientServiceTierInput,
  UpdateClientServiceTierInput,
} from './clients.validation'

export class ClientServiceTiersService {
  constructor(private prisma: PrismaClient) {}

  async findServiceTiers() {
    return this.prisma.clientServiceTier.findMany({
      orderBy: [{ priorityRank: 'desc' }, { name: 'asc' }],
      take: 100,
    })
  }

  async createServiceTier(data: CreateClientServiceTierInput) {
    return this.prisma.clientServiceTier.create({
      data: {
        name: data.name,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        priorityRank: data.priorityRank,
      },
    })
  }

  async updateServiceTier(id: string, data: UpdateClientServiceTierInput) {
    return this.prisma.clientServiceTier.update({
      where: { id },
      data,
    })
  }

  async deleteServiceTier(id: string) {
    await this.prisma.clientServiceTier.delete({
      where: { id },
    })

    return { id, deleted: true }
  }
}
