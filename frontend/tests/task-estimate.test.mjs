import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskEstimateHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-estimate.ts');
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
    console,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('formats estimated minutes as HH:MM clock values', () => {
  const { formatEstimatedMinutesAsClock } = loadTaskEstimateHelper();

  assert.equal(formatEstimatedMinutesAsClock(30), '00:30');
  assert.equal(formatEstimatedMinutesAsClock(90), '01:30');
  assert.equal(formatEstimatedMinutesAsClock(1440), '24:00');
  assert.equal(formatEstimatedMinutesAsClock(null), '');
});

test('parses HH:MM estimate inputs back to minutes', () => {
  const { parseEstimatedClockToMinutes } = loadTaskEstimateHelper();

  assert.equal(parseEstimatedClockToMinutes('00:30'), 30);
  assert.equal(parseEstimatedClockToMinutes('01:30'), 90);
  assert.equal(parseEstimatedClockToMinutes('24:00'), 1440);
  assert.equal(parseEstimatedClockToMinutes('1:05'), 65);
});

test('rejects malformed or zero HH:MM estimate inputs', () => {
  const { parseEstimatedClockToMinutes } = loadTaskEstimateHelper();

  assert.equal(parseEstimatedClockToMinutes(''), null);
  assert.equal(parseEstimatedClockToMinutes('00:00'), null);
  assert.equal(parseEstimatedClockToMinutes('1.5'), null);
  assert.equal(parseEstimatedClockToMinutes('01:75'), null);
});
