import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTimeEntryFormHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-calendar/time-entry-form.ts');
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

test('prefills edit form values from an existing time entry', () => {
  const { getTimeEntryFormDefaults } = loadTimeEntryFormHelper();

  const defaults = getTimeEntryFormDefaults({
    entry: {
      id: 'entry-1',
      userId: 'user-1',
      start: '2026-05-21T09:15:00',
      end: '2026-05-21T18:45:00',
      notes: 'Client work',
    },
    fallbackUserId: 'fallback-user',
  });

  assert.equal(defaults.manualDate, '2026-05-21');
  assert.equal(defaults.manualIn, '09:15');
  assert.equal(defaults.manualOut, '18:45');
  assert.equal(defaults.manualNotes, 'Client work');
  assert.equal(defaults.selectedUserId, 'user-1');
});

test('validates manual entry fields before API submission', () => {
  const { validateTimeEntryForm } = loadTimeEntryFormHelper();

  const result = validateTimeEntryForm({
    manualDate: '2026-05-21',
    manualIn: '18:00',
    manualOut: '09:00',
    manualNotes: '',
    selectedUserId: '',
    isPrivilegedUser: true,
    todayDate: '2026-05-21',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    userId: 'Employee is required',
    timeOut: 'Time Out must be after Time In',
    notes: 'Notes are required',
  });
});
