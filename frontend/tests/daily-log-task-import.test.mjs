import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadImportHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/daily-log-task-import.ts');
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

test('suggests completed and in-progress tasks assigned to the user for the selected date', () => {
  const { getDailyLogTaskImportOptions } = loadImportHelper();

  const options = getDailyLogTaskImportOptions([
    {
      id: 'completed-today',
      title: 'Finish payroll review',
      status: 'completed',
      assigneeId: 'user-1',
      completedAt: '2026-05-21T09:00:00',
      progress: 100,
    },
    {
      id: 'progress-today',
      title: 'Prepare client handoff',
      status: 'in_progress',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
      progress: 60,
    },
    {
      id: 'review-today',
      title: 'Review-only task',
      status: 'review',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
    },
    {
      id: 'todo-today',
      title: 'Unstarted task',
      status: 'todo',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
    },
    {
      id: 'other-user',
      title: 'Someone else task',
      status: 'completed',
      assigneeId: 'user-2',
      dueDate: '2026-05-21',
    },
    {
      id: 'completed-other-day',
      title: 'Old completed task',
      status: 'completed',
      assigneeId: 'user-1',
      dueDate: '2026-05-20',
      updatedAt: '2026-05-20T11:00:00',
    },
  ], {
    currentUserId: 'user-1',
    selectedDate: '2026-05-21',
    existingTasks: [],
  });

  assert.deepEqual(options.map((option) => option.sourceTaskId), [
    'completed-today',
    'progress-today',
  ]);
  assert.equal(options[0].completed, true);
  assert.equal(options[1].completed, false);
  assert.match(options[1].text, /Prepare client handoff/);
});

test('suggests shared completed tasks for collaborators and multi-assignees', () => {
  const { getDailyLogTaskImportOptions } = loadImportHelper();

  const tasks = [
    {
      id: 'collaborator-completed',
      title: 'Ship shared client fix',
      status: 'completed',
      assigneeId: 'owner-user',
      assignee: { id: 'owner-user', name: 'Owner User', email: 'owner@example.test' },
      collaborators: [
        {
          id: 'collab-1',
          taskId: 'collaborator-completed',
          userId: 'user-1',
          status: 'accepted',
          user: { id: 'user-1', name: 'Daily Logger', email: 'logger@example.test' },
        },
      ],
      completedAt: '2026-05-21T09:00:00',
    },
    {
      id: 'multi-assignee-completed',
      title: 'Complete grouped QA',
      status: 'completed',
      assigneeId: 'owner-user',
      assigneeIds: ['owner-user', 'user-1'],
      collaborators: [
        {
          id: 'collab-3',
          taskId: 'multi-assignee-completed',
          userId: 'user-1',
          status: 'accepted',
          user: { id: 'user-1', name: 'Daily Logger', email: 'logger@example.test' },
        },
      ],
      completedAt: '2026-05-21T10:00:00',
    },
    {
      id: 'declined-collaborator',
      title: 'Declined collaborator task',
      status: 'completed',
      assigneeId: 'owner-user',
      collaborators: [
        {
          id: 'collab-2',
          taskId: 'declined-collaborator',
          userId: 'user-1',
          status: 'declined',
          user: { id: 'user-1', name: 'Daily Logger', email: 'logger@example.test' },
        },
      ],
      completedAt: '2026-05-21T11:00:00',
    },
  ];

  const options = getDailyLogTaskImportOptions(tasks, {
    currentUserId: 'user-1',
    selectedDate: '2026-05-21',
    existingTasks: [],
  });

  assert.deepEqual(options.map((option) => option.sourceTaskId), [
    'collaborator-completed',
    'multi-assignee-completed',
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(options[0].participants.map((participant) => participant.id))), [
    'owner-user',
    'user-1',
  ]);
  assert.equal(options[0].participants[1].name, 'Daily Logger');
  assert.deepEqual(JSON.parse(JSON.stringify(options[1].participants.map((participant) => participant.id))), [
    'owner-user',
    'user-1',
  ]);
  assert.equal(options[1].participants[1].name, 'Daily Logger');
});

test('does not infer completed work from due or update date when completedAt is missing', () => {
  const { getDailyLogTaskImportOptions } = loadImportHelper();

  const options = getDailyLogTaskImportOptions([
    {
      id: 'missing-completed-date',
      title: 'Completed but timestamp missing',
      status: 'completed',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
      updatedAt: '2026-05-21T09:00:00',
    },
    {
      id: 'completed-with-date',
      title: 'Completed with timestamp',
      status: 'completed',
      assigneeId: 'user-1',
      completedAt: '2026-05-21T09:00:00',
    },
  ], {
    currentUserId: 'user-1',
    selectedDate: '2026-05-21',
    existingTasks: [],
  });

  assert.deepEqual(options.map((option) => option.sourceTaskId), ['completed-with-date']);
});

test('does not suggest or import tasks that are already present in the log', () => {
  const {
    getDailyLogTaskImportOptions,
    mergeDailyLogTasksWithImports,
  } = loadImportHelper();

  const existingTasks = [
    {
      id: 'task:already-imported',
      text: 'Already imported task',
      completed: true,
    },
  ];

  const options = getDailyLogTaskImportOptions([
    {
      id: 'already-imported',
      title: 'Already imported task',
      status: 'completed',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
    },
    {
      id: 'new-progress-task',
      title: 'New progress task',
      status: 'in_progress',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
    },
  ], {
    currentUserId: 'user-1',
    selectedDate: '2026-05-21',
    existingTasks,
  });

  assert.deepEqual(options.map((option) => option.sourceTaskId), ['new-progress-task']);

  const merged = mergeDailyLogTasksWithImports(existingTasks, [
    {
      id: 'task:already-imported',
      sourceTaskId: 'already-imported',
      text: 'Already imported task',
      completed: true,
      status: 'completed',
      progress: 100,
    },
    options[0],
  ]);

  assert.deepEqual(Array.from(merged, (task) => task.id), [
    'task:already-imported',
    'task:new-progress-task',
  ]);
  assert.equal(merged[1].sourceTaskId, 'new-progress-task');
  assert.equal(merged[1].status, 'in_progress');
});

test('surfaces review-stage tasks separately without auto-importing them', () => {
  const {
    getDailyLogTaskImportOptions,
    getDailyLogTaskReviewOptions,
  } = loadImportHelper();

  const tasks = [
    {
      id: 'review-today',
      title: 'Waiting for QA review',
      status: 'review',
      assigneeId: 'user-1',
      dueDate: '2026-05-21',
      progress: 90,
      workSessions: [
        {
          id: 'session-1',
          durationSeconds: 1800,
          startedAt: '2026-05-21T08:00:00',
          endedAt: '2026-05-21T08:30:00',
        },
      ],
    },
    {
      id: 'completed-today',
      title: 'Completed work',
      status: 'completed',
      assigneeId: 'user-1',
      completedAt: '2026-05-21T11:00:00',
    },
  ];

  const params = {
    currentUserId: 'user-1',
    selectedDate: '2026-05-21',
    existingTasks: [],
  };

  assert.deepEqual(
    getDailyLogTaskImportOptions(tasks, params).map((option) => option.sourceTaskId),
    ['completed-today'],
  );

  const reviewOptions = getDailyLogTaskReviewOptions(tasks, params);
  assert.deepEqual(reviewOptions.map((option) => option.sourceTaskId), ['review-today']);
  assert.equal(reviewOptions[0].completed, false);
  assert.equal(reviewOptions[0].sessionCount, 1);
  assert.equal(reviewOptions[0].trackedMinutes, 30);
});

test('builds Daily Log task objects from Task Tracking reports', () => {
  const { buildDailyLogTasksFromTaskReport } = loadImportHelper();

  const logTasks = buildDailyLogTasksFromTaskReport([
    {
      id: 'completed-task',
      title: 'Ship EOD report integration',
      status: 'completed',
      progress: 100,
    },
    {
      id: 'active-task',
      title: 'Review daily log handoff',
      status: 'in_progress',
      progress: 60,
    },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(logTasks)), [
    {
      id: 'task:completed-task',
      sourceTaskId: 'completed-task',
      text: 'Ship EOD report integration',
      completed: true,
      status: 'completed',
    },
    {
      id: 'task:active-task',
      sourceTaskId: 'active-task',
      text: 'Review daily log handoff',
      completed: false,
      status: 'in_progress',
    },
  ]);
});
