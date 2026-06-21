import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskSearchHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-search.ts');
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

test('matches task search across task, people, project, department, and notes', () => {
  const { taskMatchesSearchQuery } = loadTaskSearchHelper();
  const task = {
    id: 'task-17',
    title: 'Publish landing page QA',
    description: 'Confirm analytics and thank-you page events',
    status: 'in_progress',
    priority: 'High',
    role: 'Quality Analyst',
    department: { id: 'dept-creative', name: 'Creative Ops' },
    projectId: 'project-q3',
    project: {
      id: 'project-q3',
      name: 'Q3 Growth Launch',
      description: 'Public funnel cleanup',
      status: 'active',
      department: { id: 'dept-creative', name: 'Creative Ops' },
      owner: { id: 'user-owner', name: 'Mina CEO', email: 'mina@savage.test' },
      creator: { id: 'user-creator', name: 'Ops Lead', email: 'ops@savage.test' },
    },
    assignee: {
      id: 'user-1',
      name: 'Maria Santos',
      email: 'maria@savage.test',
      role: 'Frontend Developer',
      roles: [{ role: 'Designer', department: { id: 'dept-creative', name: 'Creative Ops' } }],
    },
    creator: { id: 'user-2', name: 'Jay Manager', email: 'jay@savage.test' },
    collaborators: [{
      id: 'collab-1',
      taskId: 'task-17',
      userId: 'user-3',
      status: 'invited',
      user: { id: 'user-3', name: 'Rae Writer', email: 'rae@savage.test' },
      invitedBy: { id: 'user-2', name: 'Jay Manager', email: 'jay@savage.test' },
    }],
    dueDate: '2026-06-12',
    startDate: '2026-06-10',
    notes: [{ text: 'Waiting on hero copy approval', date: '2026-06-10' }],
  };

  assert.equal(taskMatchesSearchQuery(task, ''), true);
  assert.equal(taskMatchesSearchQuery(task, 'landing qa'), true);
  assert.equal(taskMatchesSearchQuery(task, 'q3 launch'), true);
  assert.equal(taskMatchesSearchQuery(task, 'maria@savage'), true);
  assert.equal(taskMatchesSearchQuery(task, 'rae writer'), true);
  assert.equal(taskMatchesSearchQuery(task, 'creative in progress'), true);
  assert.equal(taskMatchesSearchQuery(task, 'hero approval'), true);
  assert.equal(taskMatchesSearchQuery(task, 'backend billing'), false);
});
