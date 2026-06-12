type ImportableTaskStatus = 'completed' | 'in_progress';

export interface DailyLogTaskParticipant {
  id: string;
  name?: string | null;
  email?: string | null;
  source: 'primary-assignee' | 'multi-assignee' | 'collaborator';
}

interface ImportableTaskCollaborator {
  userId?: string | number | null;
  status?: string | null;
  user?: {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface ImportableTask {
  id: string;
  title: string;
  status: string;
  assigneeId?: string | number | null;
  assigneeIds?: Array<string | number> | null;
  assignee?: {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
  } | null;
  collaborators?: ImportableTaskCollaborator[];
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
  sourceTaskId?: string;
  text: string;
  completed: boolean;
  status?: ImportableTaskStatus | 'review' | string;
  progress?: number | null;
  sessionCount?: number;
  trackedMinutes?: number;
  participants?: DailyLogTaskParticipant[];
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
const DAILY_LOG_COLLABORATOR_STATUSES = new Set(['invited', 'accepted']);

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

function addParticipant(
  participants: DailyLogTaskParticipant[],
  participant: DailyLogTaskParticipant,
) {
  if (!participant.id) return;

  const existing = participants.find((item) => item.id === participant.id);
  if (existing) {
    existing.name = existing.name || participant.name || null;
    existing.email = existing.email || participant.email || null;
    if (existing.source === 'multi-assignee' && participant.source === 'collaborator') {
      existing.source = 'collaborator';
    }
    return;
  }

  participants.push(participant);
}

export function getDailyLogTaskParticipants(task: ImportableTask): DailyLogTaskParticipant[] {
  const participants: DailyLogTaskParticipant[] = [];

  if (task.assigneeId) {
    addParticipant(participants, {
      id: String(task.assigneeId),
      name: task.assignee?.name ?? null,
      email: task.assignee?.email ?? null,
      source: 'primary-assignee',
    });
  }

  if (Array.isArray(task.assigneeIds)) {
    task.assigneeIds.forEach((assigneeId) => {
      if (!assigneeId) return;
      addParticipant(participants, {
        id: String(assigneeId),
        name: null,
        email: null,
        source: 'multi-assignee',
      });
    });
  }

  task.collaborators?.forEach((collaborator) => {
    const status = collaborator.status || '';
    if (!DAILY_LOG_COLLABORATOR_STATUSES.has(status)) return;

    const collaboratorId = collaborator.userId ?? collaborator.user?.id;
    if (!collaboratorId) return;

    addParticipant(participants, {
      id: String(collaboratorId),
      name: collaborator.user?.name ?? null,
      email: collaborator.user?.email ?? null,
      source: 'collaborator',
    });
  });

  return participants;
}

function isTaskParticipant(task: ImportableTask, currentUserId: string): boolean {
  if (!currentUserId) return false;
  return getDailyLogTaskParticipants(task).some((participant) => participant.id === currentUserId);
}

function getParticipantMetadata(task: ImportableTask): { participants?: DailyLogTaskParticipant[] } {
  const participants = getDailyLogTaskParticipants(task);
  return participants.length > 0 ? { participants } : {};
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
    .filter((task) => isTaskParticipant(task, params.currentUserId))
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
      ...getParticipantMetadata(task),
    }));
}

export function getDailyLogTaskImportOptions(
  tasks: ImportableTask[],
  params: GetDailyLogTaskImportOptionsParams,
): DailyLogTaskImportOption[] {
  const existingIds = getExistingTaskIds(params.existingTasks);

  return tasks
    .filter((task) => isTaskParticipant(task, params.currentUserId))
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
      ...getParticipantMetadata(task),
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
      sourceTaskId: option.sourceTaskId,
      text: option.text,
      completed: option.completed,
      status: option.status,
      progress: option.progress,
      sessionCount: option.sessionCount,
      trackedMinutes: option.trackedMinutes,
      participants: option.participants,
    });
    existingIds.add(option.id);
    existingIds.add(option.sourceTaskId);
  });

  return nextTasks;
}

export function buildDailyLogTasksFromTaskReport(tasks: ImportableTask[]): ExistingLogTask[] {
  return tasks.map((task) => ({
    id: `task:${task.id}`,
    sourceTaskId: task.id,
    text: task.title,
    completed: task.status === 'completed',
    status: task.status,
    ...getParticipantMetadata(task),
  }));
}
