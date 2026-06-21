import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientPortalOptions() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-portal-options.ts');
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

test('builds client ticket titles from choices and one details field', () => {
  const {
    buildClientTicketTitle,
    CLIENT_ADMIN_TICKET_VISIBILITY_OPTIONS,
    CLIENT_TICKET_STATUSES,
    getClientPortalOptionLabel,
    getClientTicketDetailPresets,
  } = loadClientPortalOptions();

  assert.equal(buildClientTicketTitle('website', 'Update the hero CTA'), 'Website Change: Update the hero CTA');
  assert.equal(buildClientTicketTitle('billing', ''), 'Billing Request');
  assert.equal(
    buildClientTicketTitle('general', 'This request has extra   spacing between words'),
    'Other: This request has extra spacing between words',
  );
  assert.equal(getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, 'in_progress'), 'In Progress');
  assert.equal(getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, 'done'), 'Done');
  assert.equal(getClientTicketDetailPresets('website')[0].label, 'Update hours/contact info');
  assert.equal(getClientTicketDetailPresets('unknown')[0].category, 'general');
  assert.equal(getClientPortalOptionLabel(CLIENT_ADMIN_TICKET_VISIBILITY_OPTIONS, 'client'), 'Client-visible reply');
  assert.equal(getClientPortalOptionLabel(CLIENT_ADMIN_TICKET_VISIBILITY_OPTIONS, 'internal'), 'Internal note');
});
