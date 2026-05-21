type ImportableTaskStatus = 'completed' | 'in_progress';

interface ImportableTask {
  id: string;
  title: string;
  status: string;
  assigneeId?: string | number | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
  progress?: number | null;
  workSessions?: Array<{
    id: string;
    startedAt?: string | null;
    endedAt?: string | null;
    durationSeconds?: number | null;
  }>;
}

interface ExistingLogTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface DailyLogTaskImportOption extends ExistingLogTask {
  sourceTaskId: string;
  status: ImportableTaskStatus | 'review';
  progress?: number | null;
  sessionCount?: number;
  trackedMinutes?: number;
}

interface GetDailyLogTaskImportOptionsParams {
  currentUserId: string;
  selectedDate: string;
  existingTasks: ExistingLogTask[];
}

const IMPORTABLE_STATUSES = new Set<ImportableTaskStatus>(['completed', 'in_progress']);

function toDateOnly(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isTaskRelevantForDate(task: ImportableTask, selectedDate: string): boolean {
  if (task.status === 'completed') {
    return toDateOnly(task.completedAt) === selectedDate;
  }

  return [task.completedAt, task.updatedAt, task.dueDate, task.startDate]
    .map(toDateOnly)
    .some((date) => date === selectedDate);
}

function getTrackedMinutes(task: ImportableTask): number {
  return Math.round(
    (task.workSessions || []).reduce((total, session) => total + (session.durationSeconds || 0), 0) / 60,
  );
}

function getExistingTaskIds(existingTasks: ExistingLogTask[]): Set<string> {
  const ids = new Set<string>();

  existingTasks.forEach((task) => {
    ids.add(task.id);
    if (task.id.startsWith('task:')) {
      ids.add(task.id.slice('task:'.length));
    }
  });

  return ids;
}

export function getDailyLogTaskReviewOptions(
  tasks: ImportableTask[],
  params: GetDailyLogTaskImportOptionsParams,
): DailyLogTaskImportOption[] {
  const existingIds = getExistingTaskIds(params.existingTasks);

  return tasks
    .filter((task) => String(task.assigneeId || '') === params.currentUserId)
    .filter((task) => task.status === 'review')
    .filter((task) => isTaskRelevantForDate(task, params.selectedDate))
    .filter((task) => !existingIds.has(task.id) && !existingIds.has(`task:${task.id}`))
    .map((task) => ({
      id: `task:${task.id}`,
      sourceTaskId: task.id,
      text: task.title,
      completed: false,
      status: 'review',
      progress: task.progress ?? null,
      sessionCount: task.workSessions?.length || 0,
      trackedMinutes: getTrackedMinutes(task),
    }));
}

export function getDailyLogTaskImportOptions(
  tasks: ImportableTask[],
  params: GetDailyLogTaskImportOptionsParams,
): DailyLogTaskImportOption[] {
  const existingIds = getExistingTaskIds(params.existingTasks);

  return tasks
    .filter((task) => String(task.assigneeId || '') === params.currentUserId)
    .filter((task) => IMPORTABLE_STATUSES.has(task.status as ImportableTaskStatus))
    .filter((task) => isTaskRelevantForDate(task, params.selectedDate))
    .filter((task) => !existingIds.has(task.id) && !existingIds.has(`task:${task.id}`))
    .map((task) => ({
      id: `task:${task.id}`,
      sourceTaskId: task.id,
      text: task.title,
      completed: task.status === 'completed',
      status: task.status as ImportableTaskStatus,
      progress: task.progress ?? null,
    }));
}

export function mergeDailyLogTasksWithImports(
  existingTasks: ExistingLogTask[],
  importOptions: DailyLogTaskImportOption[],
): ExistingLogTask[] {
  const existingIds = getExistingTaskIds(existingTasks);
  const nextTasks = [...existingTasks];

  importOptions.forEach((option) => {
    if (existingIds.has(option.id) || existingIds.has(option.sourceTaskId)) return;

    nextTasks.push({
      id: option.id,
      text: option.text,
      completed: option.completed,
    });
    existingIds.add(option.id);
    existingIds.add(option.sourceTaskId);
  });

  return nextTasks;
}
