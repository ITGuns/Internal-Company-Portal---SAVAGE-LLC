import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientPlanningRecords() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-planning-records.ts');
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('groups roadmap items into production board columns', () => {
  const { splitRoadmapItemsByStatus } = loadClientPlanningRecords();
  const columns = splitRoadmapItemsByStatus([
    { id: 'r1', status: 'planned' },
    { id: 'r2', status: 'recommended' },
    { id: 'r3', status: 'archived' },
  ]);

  assert.deepEqual(plain(columns.map((column) => column.value)), ['recommended', 'next', 'planned', 'done', 'archived']);
  assert.deepEqual(plain(columns.find((column) => column.value === 'planned').items.map((item) => item.id)), ['r1']);
  assert.deepEqual(plain(columns.find((column) => column.value === 'archived').items.map((item) => item.id)), ['r3']);
});

test('builds calendar events from non-archived scheduled items', () => {
  const { buildClientCalendarEvents } = loadClientPlanningRecords();
  const events = buildClientCalendarEvents([
    { id: 'c1', title: 'Launch prep', status: 'scheduled', startAt: '2026-06-01T09:00:00.000Z', endAt: '2026-06-01T10:00:00.000Z', channel: 'website', visibleToClient: true },
    { id: 'c2', title: 'Archived draft', status: 'archived', startAt: '2026-06-02T09:00:00.000Z' },
    { id: 'c3', title: 'Missing date', status: 'planned' },
  ]);

  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'c1');
  assert.equal(events[0].start, '2026-06-01');
  assert.equal(events[0].end, '2026-06-01');
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].extendedProps.channel, 'website');
  assert.equal(events[0].extendedProps.visibleToClient, true);
});

test('sorts calendar items by start date and creates date-click drafts', () => {
  const { createCalendarDateDraft, sortCalendarItemsByStart } = loadClientPlanningRecords();
  const sorted = sortCalendarItemsByStart([
    { id: 'late', title: 'Late', status: 'planned', startAt: '2026-06-03T09:00:00.000Z' },
    { id: 'early', title: 'Early', status: 'planned', startAt: '2026-06-01T09:00:00.000Z' },
    { id: 'unscheduled', title: 'No date', status: 'planned' },
  ]);

  assert.deepEqual(plain(sorted.map((item) => item.id)), ['early', 'late', 'unscheduled']);
  assert.deepEqual(plain(createCalendarDateDraft('2026-06-05')), {
    startAt: '2026-06-05',
    endAt: '',
  });
});
