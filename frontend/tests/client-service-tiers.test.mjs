import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientServiceTiers() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-service-tiers.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('sorts and upserts client service tiers by priority and name', () => {
  const { sortClientServiceTiers, upsertClientServiceTier } = loadClientServiceTiers();
  const starterTiers = [
    { id: 'standard', name: 'Standard', priorityRank: 1 },
    { id: 'growth', name: 'Growth', priorityRank: 5 },
  ];

  assert.deepEqual(Array.from(sortClientServiceTiers(starterTiers), (tier) => tier.id), ['growth', 'standard']);
  assert.deepEqual(
    Array.from(
      upsertClientServiceTier(starterTiers, { id: 'premium', name: 'Premium', priorityRank: 10 }),
      (tier) => tier.id,
    ),
    ['premium', 'growth', 'standard'],
  );
  assert.deepEqual(
    Array.from(
      upsertClientServiceTier(starterTiers, { id: 'standard', name: 'Standard Plus', priorityRank: 7 }),
      (tier) => tier.id,
    ),
    ['standard', 'growth'],
  );
});

test('removes a deleted client service tier without reordering survivors', () => {
  const { removeClientServiceTier } = loadClientServiceTiers();
  const tiers = [
    { id: 'premium', name: 'Premium', priorityRank: 10 },
    { id: 'growth', name: 'Growth', priorityRank: 5 },
    { id: 'standard', name: 'Standard', priorityRank: 1 },
  ];

  assert.deepEqual(Array.from(removeClientServiceTier(tiers, 'growth'), (tier) => tier.id), ['premium', 'standard']);
  assert.deepEqual(Array.from(removeClientServiceTier(tiers, 'missing'), (tier) => tier.id), ['premium', 'growth', 'standard']);
});

test('labels SOP client service tiers with visible tier numbers', () => {
  const { getClientServiceTierDisplayName, getClientServiceTierLevel } = loadClientServiceTiers();

  assert.equal(getClientServiceTierLevel({ name: 'Standard Business Website' }), 1);
  assert.equal(getClientServiceTierLevel({ name: 'Premium Managed Growth System' }), 5);
  assert.equal(
    getClientServiceTierDisplayName({ name: 'Growth Business Website' }),
    'Growth Business Website (Tier 2)',
  );
  assert.equal(getClientServiceTierDisplayName({ name: 'Custom Retainer' }), 'Custom Retainer');
});
