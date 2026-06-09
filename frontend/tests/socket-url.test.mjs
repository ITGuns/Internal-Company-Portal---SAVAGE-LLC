import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSocketUrlHelpers(wsUrl) {
  const helperPath = path.resolve(__dirname, '../src/lib/socket-url.ts');
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
    URL,
    require: (specifier) => {
      if (specifier === './config') {
        return { APP_CONFIG: { wsUrl } };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('keeps local loopback socket URLs for local development', () => {
  const { resolveSocketUrl } = loadSocketUrlHelpers('ws://localhost:4000');

  assert.equal(resolveSocketUrl(undefined, 'http://localhost:3000'), 'http://localhost:4000');
});

test('uses same-origin socket URL for production cross-origin backend config', () => {
  const { resolveSocketUrl } = loadSocketUrlHelpers('https://deskibackend-1.onrender.com');

  assert.equal(
    resolveSocketUrl(undefined, 'https://internal-company-portal-savage-llc.vercel.app'),
    'https://internal-company-portal-savage-llc.vercel.app',
  );
});

test('normalizes same-origin websocket URLs to the current origin', () => {
  const { resolveSocketUrl } = loadSocketUrlHelpers('wss://internal-company-portal-savage-llc.vercel.app');

  assert.equal(
    resolveSocketUrl(undefined, 'https://internal-company-portal-savage-llc.vercel.app'),
    'https://internal-company-portal-savage-llc.vercel.app',
  );
});

test('preserves configured socket URL without a browser origin', () => {
  const { resolveSocketUrl } = loadSocketUrlHelpers('wss://deskibackend-1.onrender.com');

  assert.equal(resolveSocketUrl(), 'https://deskibackend-1.onrender.com');
});
