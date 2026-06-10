import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadFormatHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/daily-log-format.ts');
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

test('formats decimal daily-log hours as HH:MM values', () => {
  const { formatDecimalHoursAsClock } = loadFormatHelper();

  assert.equal(formatDecimalHoursAsClock(8), '08:00');
  assert.equal(formatDecimalHoursAsClock(1.5), '01:30');
  assert.equal(formatDecimalHoursAsClock(0.25), '00:15');
  assert.equal(formatDecimalHoursAsClock(null), '');
});

test('normalizes typed hour values into HH:MM input text', () => {
  const { normalizeHoursClockInput } = loadFormatHelper();

  assert.equal(normalizeHoursClockInput('8'), '08:00');
  assert.equal(normalizeHoursClockInput('8:5'), '08:05');
  assert.equal(normalizeHoursClockInput('08:30'), '08:30');
  assert.equal(normalizeHoursClockInput('8.5'), '08:30');
  assert.equal(normalizeHoursClockInput('24:01'), null);
});

test('parses HH:MM daily-log hours back to decimal hours', () => {
  const { parseHoursClockToDecimal } = loadFormatHelper();

  assert.equal(parseHoursClockToDecimal('08:00'), 8);
  assert.equal(parseHoursClockToDecimal('08:30'), 8.5);
  assert.equal(parseHoursClockToDecimal('00:15'), 0.25);
  assert.equal(parseHoursClockToDecimal('24:00'), 24);
  assert.equal(parseHoursClockToDecimal('24:01'), null);
});

test('derives the daily-log status from task statuses', () => {
  const { deriveDailyLogStatusFromTasks } = loadFormatHelper();

  assert.equal(
    deriveDailyLogStatusFromTasks([
      { id: 'task:1', text: 'Done', completed: true, status: 'completed' },
      { id: 'task:2', text: 'Also done', completed: true },
    ]),
    'completed',
  );
  assert.equal(
    deriveDailyLogStatusFromTasks([
      { id: 'task:review', text: 'QA review', completed: false, status: 'review' },
      { id: 'task:done', text: 'Done', completed: true, status: 'completed' },
    ]),
    'review',
  );
  assert.equal(
    deriveDailyLogStatusFromTasks([
      { id: 'task:active', text: 'Active', completed: false, status: 'in_progress' },
      { id: 'task:review', text: 'QA review', completed: false, status: 'review' },
    ]),
    'in-progress',
  );
  assert.equal(
    deriveDailyLogStatusFromTasks([
      { id: 'manual', text: 'Legacy unchecked task', completed: false },
    ]),
    'in-progress',
  );
});
