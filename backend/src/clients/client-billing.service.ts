import type { PrismaClient } from '@prisma/client'
import {
  CLIENT_ACTIVITY_TYPES,
  createClientActivity,
} from './clients.activity'
import type { UpsertClientBillingStatusInput } from './clients.validation'

export class ClientBillingService {
  constructor(private prisma: PrismaClient) {}

  async upsertBillingStatus(organizationId: string, data: UpsertClientBillingStatusInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const billing = await tx.clientBillingStatus.upsert({
        where: { organizationId },
        update: data,
        create: {
          organizationId,
          ...data,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.billingUpdated,
        subjectType: 'billing_status',
        subjectId: billing.id,
        visibility: billing.visibleToClient ? 'client' : 'internal',
        title: `Billing status updated: ${billing.status}`,
        body: billing.notes || null,
        metadata: {
          planName: billing.planName || null,
          status: billing.status,
          monthlyAmount: billing.monthlyAmount,
          currency: billing.currency,
          renewalAt: billing.renewalAt ? billing.renewalAt.toISOString() : null,
        },
      })

      return billing
    })
  }
}
