import type { ClientServiceTier, PrismaClient } from '@prisma/client'

export interface ClientServiceTierPreset {
  name: string
  description: string
  monthlyPrice: number
  priorityRank: number
}

export const CLIENT_SERVICE_TIER_PRESETS: readonly ClientServiceTierPreset[] = [
  {
    name: 'Premium Managed Growth System',
    description: 'Starts at $9,997. Expected to include manager support funded by subscription and custom systems as approved.',
    monthlyPrice: 9997,
    priorityRank: 50,
  },
  {
    name: 'Managed Growth Website System',
    description: 'Advanced site plus automations, reporting, workflow support, and part-time manager inclusion.',
    monthlyPrice: 4997,
    priorityRank: 40,
  },
  {
    name: 'Conversion and Local Growth System',
    description: 'More pages, local SEO structure, analytics setup, stronger content, and better funnel path.',
    monthlyPrice: 2997,
    priorityRank: 30,
  },
  {
    name: 'Growth Business Website',
    description: 'Stronger site structure, lead capture, review proof, and conversion-focused sections.',
    monthlyPrice: 997,
    priorityRank: 20,
  },
  {
    name: 'Standard Business Website',
    description: 'Final site included; starter package for simple business presence.',
    monthlyPrice: 497,
    priorityRank: 10,
  },
]

type ClientServiceTierPresetClient = Pick<PrismaClient, 'clientServiceTier'>

export function getClientServiceTierPresetNames(): string[] {
  return CLIENT_SERVICE_TIER_PRESETS.map((tier) => tier.name)
}

export async function upsertClientServiceTierPresets(
  client: ClientServiceTierPresetClient,
): Promise<ClientServiceTier[]> {
  for (const tier of CLIENT_SERVICE_TIER_PRESETS) {
    await client.clientServiceTier.upsert({
      where: { name: tier.name },
      update: {
        description: tier.description,
        monthlyPrice: tier.monthlyPrice,
        priorityRank: tier.priorityRank,
      },
      create: tier,
    })
  }

  return client.clientServiceTier.findMany({
    where: {
      name: {
        in: getClientServiceTierPresetNames(),
      },
    },
    orderBy: [{ priorityRank: 'desc' }, { name: 'asc' }],
  })
}
