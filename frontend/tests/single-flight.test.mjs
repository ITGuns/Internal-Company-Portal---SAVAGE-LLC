import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/single-flight.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports }, { filename: helperPath });
  return compiledModule.exports;
}

const { singleFlight } = loadHelper();

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('concurrent calls share one request', async () => {
  let calls = 0;
  const pending = deferred();
  const run = singleFlight(() => {
    calls += 1;
    return pending.promise;
  });

  const first = run();
  const second = run();
  assert.equal(calls, 1);
  assert.equal(first, second);

  pending.resolve('closed');
  assert.equal(await first, 'closed');
  assert.equal(await second, 'closed');
});

test('a call after the request settles runs again', async () => {
  let calls = 0;
  const run = singleFlight(async () => {
    calls += 1;
    return calls;
  });

  assert.equal(await run(), 1);
  assert.equal(await run(), 2);
});

test('a failed request releases the guard', async () => {
  let calls = 0;
  const run = singleFlight(async () => {
    calls += 1;
    if (calls === 1) throw new Error('Not clocked in');
    return 'ok';
  });

  await assert.rejects(run(), /Not clocked in/);
  assert.equal(await run(), 'ok');
  assert.equal(calls, 2);
});
