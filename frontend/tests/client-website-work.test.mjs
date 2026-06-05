import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientWebsiteWork() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-website-work.ts');
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

test('formats client website work labels and URL helper copy', () => {
  const {
    CLIENT_WEBSITE_WORK_TYPES,
    getClientWebsiteUrlHelperText,
    getClientWebsiteUrlLabel,
    getClientWebsiteWorkTypeLabel,
    isClientWebsiteWorkType,
  } = loadClientWebsiteWork();

  assert.deepEqual(
    Array.from(CLIENT_WEBSITE_WORK_TYPES, (option) => option.value),
    ['existing_site_improvement', 'new_build'],
  );
  assert.equal(isClientWebsiteWorkType('new_build'), true);
  assert.equal(isClientWebsiteWorkType('site_refresh'), false);
  assert.equal(getClientWebsiteWorkTypeLabel('existing_site_improvement'), 'Improve existing website');
  assert.equal(getClientWebsiteWorkTypeLabel('new_build'), 'Build new website');
  assert.equal(getClientWebsiteWorkTypeLabel(null), 'Website work not set');
  assert.equal(getClientWebsiteUrlLabel('new_build'), 'Current or target Website URL');
  assert.equal(getClientWebsiteUrlLabel('existing_site_improvement'), 'Existing Website URL');
  assert.match(getClientWebsiteUrlHelperText('new_build'), /leave blank if none exists yet/i);
  assert.match(getClientWebsiteUrlHelperText('existing_site_improvement'), /website we will improve/i);
});
