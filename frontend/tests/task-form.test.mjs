import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTsModule(relativePath, requireModule) {
  const modulePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(modulePath, 'utf8');
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
    require: requireModule,
  }, { filename: modulePath });

  return compiledModule.exports;
}

function loadTaskFormHelpers() {
  const taskEstimate = loadTsModule('../src/lib/task-estimate.ts', () => {
    throw new Error('task-estimate has no imports');
  });

  return loadTsModule('../src/lib/task-form.ts', (specifier) => {
    if (specifier === './task-estimate') return taskEstimate;
    throw new Error(`Unexpected import: ${specifier}`);
  });
}

const validValues = {
  title: 'Prepare payroll export',
  description: 'Export October hours for finance.',
  assigneeId: 'user-1',
  estimatedTime: '01:30',
  requireAssignee: true,
};

test('accepts a complete task form', () => {
  const { validateTaskForm } = loadTaskFormHelpers();

  assert.deepEqual({ ...validateTaskForm(validValues) }, {});
});

test('names every missing required field, in form order', () => {
  const { validateTaskForm } = loadTaskFormHelpers();

  const errors = validateTaskForm({
    title: '   ',
    description: '',
    assigneeId: '',
    estimatedTime: '',
    requireAssignee: true,
  });

  assert.deepEqual(Object.keys(errors), ['title', 'description', 'assignee', 'estimatedTime']);
  assert.match(errors.description, /description/i);
  assert.match(errors.assignee, /assign/i);
  assert.match(errors.estimatedTime, /HH:MM/);
});

test('only asks for an assignee when the person can assign tasks', () => {
  const { validateTaskForm } = loadTaskFormHelpers();

  assert.equal(validateTaskForm({ ...validValues, assigneeId: '', requireAssignee: false }).assignee, undefined);
  assert.ok(validateTaskForm({ ...validValues, assigneeId: '', requireAssignee: true }).assignee);
});

test('needs a non-zero ETOC written as HH:MM', () => {
  const { validateTaskForm } = loadTaskFormHelpers();

  assert.equal(validateTaskForm({ ...validValues, estimatedTime: '1:30' }).estimatedTime, undefined);
  assert.equal(validateTaskForm({ ...validValues, estimatedTime: '120:00' }).estimatedTime, undefined);
  assert.ok(validateTaskForm({ ...validValues, estimatedTime: '00:00' }).estimatedTime);
  assert.ok(validateTaskForm({ ...validValues, estimatedTime: '90' }).estimatedTime);
  assert.ok(validateTaskForm({ ...validValues, estimatedTime: '01:75' }).estimatedTime);
});
