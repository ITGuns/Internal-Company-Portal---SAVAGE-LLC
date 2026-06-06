export interface TaskWorkSessionLike {
  id: string;
  startedAt?: string | null;
  durationSeconds?: number | null;
}

export interface TaskWorkSummaryInput {
  totalElapsed?: number | null;
  estimatedTime?: number | null;
  workSessions?: TaskWorkSessionLike[] | null;
}

export interface TaskWorkSummary {
  sessionCount: number;
  trackedSeconds: number;
  estimatedSeconds: number;
  remainingSeconds: number;
  isOverEstimate: boolean;
}

export function formatDurationSeconds(seconds?: number | null): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));

  if (safeSeconds === 0) return "0m";

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  }

  if (minutes > 0) {
    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`;
  }

  return `${remainingSeconds}s`;
}

export function sortTaskWorkSessions<T extends TaskWorkSessionLike>(sessions: readonly T[] = []): T[] {
  return [...sessions].sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function getTaskWorkSummary(input: TaskWorkSummaryInput): TaskWorkSummary {
  const sessionCount = input.workSessions?.length || 0;
  const sessionSeconds = input.workSessions?.reduce(
    (sum, session) => sum + Math.max(0, Math.floor(session.durationSeconds || 0)),
    0,
  ) || 0;
  const trackedSeconds = Math.max(0, Math.floor(input.totalElapsed || sessionSeconds));
  const estimatedSeconds = Math.max(0, Math.floor(input.estimatedTime || 0) * 60);
  const remainingSeconds = Math.max(0, estimatedSeconds - trackedSeconds);

  return {
    sessionCount,
    trackedSeconds,
    estimatedSeconds,
    remainingSeconds,
    isOverEstimate: estimatedSeconds > 0 && trackedSeconds > estimatedSeconds,
  };
}
