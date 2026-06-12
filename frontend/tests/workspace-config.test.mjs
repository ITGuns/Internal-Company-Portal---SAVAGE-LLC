import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadWorkspaceConfig(fetchImpl) {
  const helperPath = path.resolve(__dirname, '../src/lib/workspace-config.ts');
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
    fetch: fetchImpl,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('loads public workspace config and normalizes empty logo urls', async () => {
  let requestedUrl;
  let requestedOptions;
  const { fetchWorkspaceConfig } = loadWorkspaceConfig(async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return {
      ok: true,
      json: async () => ({
        name: 'Acme Operations',
        logoUrl: '   ',
        logoAlt: 'Acme logo',
        tagline: 'Delivery hub',
        signInMessage: 'Sign in to your Acme Operations workspace',
      }),
    };
  });

  const workspaceConfig = await fetchWorkspaceConfig();

  assert.equal(requestedUrl, '/api/workspace/public');
  assert.deepEqual(JSON.parse(JSON.stringify(requestedOptions)), { cache: 'force-cache' });
  assert.deepEqual(JSON.parse(JSON.stringify(workspaceConfig)), {
    name: 'Acme Operations',
    logoUrl: null,
    logoAlt: 'Acme logo',
    tagline: 'Delivery hub',
    signInMessage: 'Sign in to your Acme Operations workspace',
  });
});

test('falls back to Deskii branding when the public workspace request fails', async () => {
  const { DEFAULT_WORKSPACE_CONFIG, fetchWorkspaceConfig } = loadWorkspaceConfig(async () => {
    throw new Error('network down');
  });

  assert.deepEqual(await fetchWorkspaceConfig(), DEFAULT_WORKSPACE_CONFIG);
});
