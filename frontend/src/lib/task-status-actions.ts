export type TaskQuickAction = "play" | "pause" | "complete" | "reopen";

type ReopenProgressInput = {
  estimatedTime?: number;
  progress?: number;
  totalElapsed?: number;
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function getReopenedTaskProgress(task: ReopenProgressInput): number {
  if (task.estimatedTime && task.estimatedTime > 0 && task.totalElapsed && task.totalElapsed > 0) {
    return clampProgress((task.totalElapsed / (task.estimatedTime * 60)) * 100);
  }

  return clampProgress(task.progress || 0);
}

export const TASK_QUICK_ACTION_LABELS: Record<TaskQuickAction, string> = {
  play: "Start",
  pause: "Pause",
  complete: "Done",
  reopen: "Reopen",
};
