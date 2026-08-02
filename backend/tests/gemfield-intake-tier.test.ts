// Every Gemfield intake client must land on a real portal service tier.
//
// Regression guard. The original code looked up a ClientServiceTier whose name
// equalled the Gemfield plan label ("Foundation"/"Growth"/"Scale"/"Strategic").
// No seeded tier is named that, so the lookup missed on every intake and every
// organization was created with tierId null - and because an unmatched label
// was treated as an acceptable miss, nothing ever reported it. These tests fail
// if that coupling comes back, or if the configured tier stops resolving.
import assert from 'node:assert/strict'
import { getGemfieldPortalTierName } from '../src/clients/gemfield/gemfield.config'
import {
  CLIENT_SERVICE_TIER_PRESETS,
  getClientServiceTierPresetNames,
} from '../src/clients/client-service-tier-presets'

const GEMFIELD_PLAN_LABELS = ['Foundation', 'Growth', 'Scale', 'Strategic']

function testConfiguredTierResolvesToASeededPreset(): void {
  const configured = getGemfieldPortalTierName()
  const names = getClientServiceTierPresetNames()

  assert.ok(
    names.some((name) => name.toLowerCase() === configured.toLowerCase()),
    `GEMFIELD_PORTAL_TIER "${configured}" must match a seeded ClientServiceTier. ` +
      `Seeded names: ${names.join(' | ')}`,
  )
}

function testDefaultIsTheIntendedTier(): void {
  const previous = process.env.GEMFIELD_PORTAL_TIER
  delete process.env.GEMFIELD_PORTAL_TIER
  try {
    assert.equal(
      getGemfieldPortalTierName(),
      'Managed Growth Website System',
      'default portal tier for intake clients',
    )
  } finally {
    if (previous === undefined) delete process.env.GEMFIELD_PORTAL_TIER
    else process.env.GEMFIELD_PORTAL_TIER = previous
  }
}

function testEnvOverrideWins(): void {
  const previous = process.env.GEMFIELD_PORTAL_TIER
  process.env.GEMFIELD_PORTAL_TIER = 'Premium Managed Growth System'
  try {
    assert.equal(getGemfieldPortalTierName(), 'Premium Managed Growth System', 'env overrides the default')
  } finally {
    if (previous === undefined) delete process.env.GEMFIELD_PORTAL_TIER
    else process.env.GEMFIELD_PORTAL_TIER = previous
  }
}

/**
 * The bug itself, pinned: no Gemfield plan label is a ClientServiceTier name.
 * If this ever stops holding, matching on the plan label could look like it
 * works for one plan and silently fail for the rest - the worst outcome.
 */
function testPlanLabelsAreNotTierNames(): void {
  const names = getClientServiceTierPresetNames().map((name) => name.toLowerCase())

  for (const label of GEMFIELD_PLAN_LABELS) {
    assert.ok(
      !names.includes(label.toLowerCase()),
      `Gemfield plan "${label}" must not be treated as a ClientServiceTier name - ` +
        'the plan describes the website engagement, the tier describes the portal service level',
    )
  }
}

function testPresetsAreDistinctlyRanked(): void {
  const ranks = CLIENT_SERVICE_TIER_PRESETS.map((preset) => preset.priorityRank)
  assert.equal(new Set(ranks).size, ranks.length, 'each preset tier needs a distinct priorityRank to order by')
}

function run(): void {
  testConfiguredTierResolvesToASeededPreset()
  testDefaultIsTheIntendedTier()
  testEnvOverrideWins()
  testPlanLabelsAreNotTierNames()
  testPresetsAreDistinctlyRanked()
  console.log('gemfield-intake-tier tests passed')
}

run()
