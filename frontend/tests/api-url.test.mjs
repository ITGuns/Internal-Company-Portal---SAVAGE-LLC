import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadApiUrlHelpers(apiUrl, options = {}) {
  const helperPath = path.resolve(__dirname, '../src/lib/api-url.ts');
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
        return { APP_CONFIG: { apiUrl } };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    },
    ...(options.windowOrigin
      ? {
        window: {
          location: {
            origin: options.windowOrigin,
          },
        },
      }
      : {}),
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('builds same-origin API and auth URLs by default', () => {
  const { buildApiUrl, buildAuthUrl, normalizeApiBaseUrl } = loadApiUrlHelpers('');

  assert.equal(normalizeApiBaseUrl(), '/api');
  assert.equal(buildApiUrl('/clients'), '/api/clients');
  assert.equal(buildAuthUrl('/login'), '/backend-auth/login');
});

test('builds external backend API and auth URLs from NEXT_PUBLIC_API_URL', () => {
  const { buildApiUrl, buildAuthUrl, normalizeApiBaseUrl } = loadApiUrlHelpers('https://api.mydeskii.com/api/');

  assert.equal(normalizeApiBaseUrl(), 'https://api.mydeskii.com/api');
  assert.equal(buildApiUrl('clients'), 'https://api.mydeskii.com/api/clients');
  assert.equal(buildAuthUrl('/login'), 'https://api.mydeskii.com/backend-auth/login');
});

test('adds the API path when the configured external backend omits it', () => {
  const { buildApiUrl, buildAuthUrl, normalizeApiBaseUrl } = loadApiUrlHelpers('https://api.mydeskii.com');

  assert.equal(normalizeApiBaseUrl(), 'https://api.mydeskii.com/api');
  assert.equal(buildApiUrl('/health-check'), 'https://api.mydeskii.com/api/health-check');
  assert.equal(buildAuthUrl('/refresh'), 'https://api.mydeskii.com/backend-auth/refresh');
});

test('uses same-origin browser API routes when public API URL points to another origin', () => {
  const { buildApiUrl, buildAuthUrl, normalizeApiBaseUrl } = loadApiUrlHelpers(
    'https://deskibackend-1.onrender.com',
    { windowOrigin: 'https://internal-company-portal-savage-llc.vercel.app' },
  );

  assert.equal(normalizeApiBaseUrl(), '/api');
  assert.equal(buildApiUrl('/departments'), '/api/departments');
  assert.equal(buildAuthUrl('/login'), '/backend-auth/login');
});

test('keeps absolute browser API URL when it already matches the current origin', () => {
  const { buildApiUrl, buildAuthUrl, normalizeApiBaseUrl } = loadApiUrlHelpers(
    'https://internal-company-portal-savage-llc.vercel.app/api',
    { windowOrigin: 'https://internal-company-portal-savage-llc.vercel.app' },
  );

  assert.equal(normalizeApiBaseUrl(), 'https://internal-company-portal-savage-llc.vercel.app/api');
  assert.equal(buildApiUrl('/departments'), 'https://internal-company-portal-savage-llc.vercel.app/api/departments');
  assert.equal(buildAuthUrl('/login'), 'https://internal-company-portal-savage-llc.vercel.app/backend-auth/login');
});
