import assert from 'node:assert/strict'
import {
  CLIENT_SERVICE_TIER_PRESETS,
  getClientServiceTierPresetNames,
} from '../src/clients/client-service-tier-presets'

assert.deepEqual(getClientServiceTierPresetNames(), [
  'Premium Managed Growth System',
  'Managed Growth Website System',
  'Conversion and Local Growth System',
  'Growth Business Website',
  'Standard Business Website',
])

assert.deepEqual(
  CLIENT_SERVICE_TIER_PRESETS.map((tier) => tier.monthlyPrice),
  [9997, 4997, 2997, 997, 497],
)

assert.deepEqual(
  CLIENT_SERVICE_TIER_PRESETS.map((tier) => tier.priorityRank),
  [50, 40, 30, 20, 10],
)

assert.equal(
  CLIENT_SERVICE_TIER_PRESETS.every((tier) => tier.description.trim().length > 0),
  true,
)

console.log('client-service-tier-presets tests passed')
