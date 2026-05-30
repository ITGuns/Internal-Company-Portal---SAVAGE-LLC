import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientActivity() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-activity.ts');
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
    require: () => ({ apiFetch: async () => ({ json: async () => [] }) }),
    URLSearchParams,
    encodeURIComponent,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('groups client action queue by category without dropping empty buckets', () => {
  const { groupClientActionQueue } = loadClientActivity();

  const grouped = groupClientActionQueue([
    { id: 'q1', category: 'approval_needed' },
    { id: 'q2', category: 'client_response_needed' },
    { id: 'q3', category: 'approval_needed' },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(grouped.approval_needed.map((item) => item.id))), ['q1', 'q3']);
  assert.deepEqual(JSON.parse(JSON.stringify(grouped.client_response_needed.map((item) => item.id))), ['q2']);
  assert.deepEqual(JSON.parse(JSON.stringify(grouped.team_response_needed)), []);
});

test('maps activity types to dashboard tones', () => {
  const { getClientActivityTone } = loadClientActivity();

  assert.equal(getClientActivityTone('ticket_client_reply_created'), 'message');
  assert.equal(getClientActivityTone('approval_approved'), 'approval');
  assert.equal(getClientActivityTone('work_item_completed'), 'work');
  assert.equal(getClientActivityTone('report_published'), 'report');
  assert.equal(getClientActivityTone('calendar_deleted'), 'calendar');
  assert.equal(getClientActivityTone('billing_updated'), 'account');
  assert.equal(getClientActivityTone('organization_service_tier_updated'), 'account');
});
