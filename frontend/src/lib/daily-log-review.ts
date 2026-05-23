interface ReviewableDailyLog {
  authorId: string;
  date: string;
  status: string;
  hoursLogged?: number | null;
  tasks?: unknown[];
}

interface DailyLogReviewSummaryOptions {
  selectedUserId?: string;
}

export interface DailyLogReviewSummary {
  totalLogs: number;
  completedLogs: number;
  inProgressLogs: number;
  blockedLogs: number;
  totalHours: number;
  linkedTaskCount: number;
  lastLogDate: string | null;
}

function isLinkedTaskEntry(task: unknown): boolean {
  return (
    typeof task === 'object' &&
    task !== null &&
    'id' in task &&
    typeof task.id === 'string' &&
    task.id.startsWith('task:')
  );
}

export function getDailyLogReviewSummary(
  logs: ReviewableDailyLog[],
  options: DailyLogReviewSummaryOptions = {},
): DailyLogReviewSummary {
  const filteredLogs = options.selectedUserId
    ? logs.filter((log) => log.authorId === options.selectedUserId)
    : logs;

  return {
    totalLogs: filteredLogs.length,
    completedLogs: filteredLogs.filter((log) => log.status === "completed").length,
    inProgressLogs: filteredLogs.filter((log) => log.status === "in-progress").length,
    blockedLogs: filteredLogs.filter((log) => log.status === "blocked").length,
    totalHours: filteredLogs.reduce((total, log) => total + (log.hoursLogged || 0), 0),
    linkedTaskCount: filteredLogs.reduce(
      (total, log) => total + (log.tasks || []).filter(isLinkedTaskEntry).length,
      0,
    ),
    lastLogDate: filteredLogs
      .map((log) => log.date)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
  };
}
