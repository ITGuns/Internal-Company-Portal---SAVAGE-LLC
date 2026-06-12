import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAnnouncementFilterHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/announcement-filters.ts');
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

test('resolves and applies announcement category filters', () => {
  const {
    ANNOUNCEMENT_FILTER_OPTIONS,
    countAnnouncementsByCategory,
    filterAnnouncementsByCategory,
    getAnnouncementFilterFromSearch,
  } = loadAnnouncementFilterHelpers();

  const announcements = [
    { id: 'news-1', category: 'company-news', title: 'Policy update' },
    { id: 'shoutout-1', category: 'shoutouts', title: 'Design win' },
    { id: 'event-1', category: 'events', title: 'Planning call' },
    { id: 'birthday-1', category: 'birthdays', title: 'Team birthday' },
    { id: 'news-2', category: 'company-news', title: 'Security reminder' },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(ANNOUNCEMENT_FILTER_OPTIONS.map((option) => option.value))),
    ['company-news', 'shoutouts', 'events', 'birthdays'],
  );
  assert.equal(getAnnouncementFilterFromSearch(new URLSearchParams('category=events')), 'events');
  assert.equal(getAnnouncementFilterFromSearch(new URLSearchParams('category=bad')), 'all');
  assert.deepEqual(
    filterAnnouncementsByCategory(announcements, 'company-news').map((announcement) => announcement.id),
    ['news-1', 'news-2'],
  );
  assert.deepEqual(
    filterAnnouncementsByCategory(announcements, 'all').map((announcement) => announcement.id),
    ['news-1', 'shoutout-1', 'event-1', 'birthday-1', 'news-2'],
  );
  assert.equal(countAnnouncementsByCategory(announcements, 'birthdays'), 1);
});
