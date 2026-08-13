import type { ClientServiceTier, PrismaClient } from '@prisma/client'

export interface ClientServiceTierPreset {
  /**
   * Stable key shared with the frontend pricing page. Names are NOT stable
   * between the two sides - the pricing page writes "Conversion & Local Growth
   * System" while the seeded tier is "Conversion and Local Growth System" - so
   * anything crossing the boundary keys on the slug, never the display name.
   */
  slug: string
  name: string
  description: string
  monthlyPrice: number
  priorityRank: number
}

export const CLIENT_SERVICE_TIER_PRESETS: readonly ClientServiceTierPreset[] = [
  {
    slug: 'premium',
    name: 'Premium Managed Growth System',
    description: 'Starts at $9,997. Expected to include manager support funded by subscription and custom systems as approved.',
    monthlyPrice: 9997,
    priorityRank: 50,
  },
  {
    slug: 'managed',
    name: 'Managed Growth Website System',
    description: 'Advanced site plus automations, reporting, workflow support, and part-time manager inclusion.',
    monthlyPrice: 4997,
    priorityRank: 40,
  },
  {
    slug: 'conversion',
    name: 'Conversion and Local Growth System',
    description: 'More pages, local SEO structure, analytics setup, stronger content, and better funnel path.',
    monthlyPrice: 2997,
    priorityRank: 30,
  },
  {
    slug: 'growth',
    name: 'Growth Business Website',
    description: 'Stronger site structure, lead capture, review proof, and conversion-focused sections.',
    monthlyPrice: 997,
    priorityRank: 20,
  },
  {
    slug: 'standard',
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

/** Resolve a plan by its stable slug. Returns null for an unknown slug. */
export function findClientServiceTierPresetBySlug(slug: string): ClientServiceTierPreset | null {
  const wanted = String(slug || '').trim().toLowerCase()
  return CLIENT_SERVICE_TIER_PRESETS.find((tier) => tier.slug === wanted) ?? null
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
      // Narrowed deliberately: `slug` is a code-side key for crossing the
      // frontend boundary, not a ClientServiceTier column.
      create: {
        name: tier.name,
        description: tier.description,
        monthlyPrice: tier.monthlyPrice,
        priorityRank: tier.priorityRank,
      },
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
