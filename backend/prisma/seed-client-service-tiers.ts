import { PrismaService, prisma } from '../src/database/prisma.service'
import { upsertClientServiceTierPresets } from '../src/clients/client-service-tier-presets'

async function main() {
  const tiers = await upsertClientServiceTierPresets(prisma)
  console.log(`Upserted ${tiers.length} client service tier presets.`)
  for (const tier of tiers) {
    console.log(`- ${tier.name}: $${tier.monthlyPrice ?? 0}`)
  }
}

main()
  .catch((error) => {
    console.error('Client service tier preset seed failed.')
    console.error('Error Name:', error.name)
    console.error('Error Message:', error.message)
    process.exit(1)
  })
  .finally(async () => {
    await PrismaService.disconnect()
  })
