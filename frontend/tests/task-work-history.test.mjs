import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskWorkHistoryHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-work-history.ts');
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

test('formats task work durations for compact task history display', () => {
  const { formatDurationSeconds } = loadTaskWorkHistoryHelper();

  assert.equal(formatDurationSeconds(0), '0m');
  assert.equal(formatDurationSeconds(65), '1m 5s');
  assert.equal(formatDurationSeconds(3661), '1h 1m');
});

test('sorts task work sessions newest first without mutating input', () => {
  const { sortTaskWorkSessions } = loadTaskWorkHistoryHelper();

  const sessions = [
    { id: 'older', startedAt: '2026-05-21T08:00:00.000Z', durationSeconds: 600 },
    { id: 'newer', startedAt: '2026-05-21T10:00:00.000Z', durationSeconds: 1200 },
  ];

  const sorted = sortTaskWorkSessions(sessions);

  assert.deepEqual(Array.from(sorted, (session) => session.id), ['newer', 'older']);
  assert.deepEqual(sessions.map((session) => session.id), ['older', 'newer']);
});

test('summarizes tracked work against the task estimate', () => {
  const { getTaskWorkSummary } = loadTaskWorkHistoryHelper();

  const summary = getTaskWorkSummary({
    totalElapsed: 5400,
    estimatedTime: 120,
    workSessions: [
      { id: 'a', startedAt: '2026-05-21T08:00:00.000Z', durationSeconds: 1800 },
      { id: 'b', startedAt: '2026-05-21T09:00:00.000Z', durationSeconds: 3600 },
    ],
  });

  assert.equal(summary.sessionCount, 2);
  assert.equal(summary.trackedSeconds, 5400);
  assert.equal(summary.estimatedSeconds, 7200);
  assert.equal(summary.remainingSeconds, 1800);
  assert.equal(summary.isOverEstimate, false);
});
