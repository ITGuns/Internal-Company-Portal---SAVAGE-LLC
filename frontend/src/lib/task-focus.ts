import type { Task } from "./tasks";

export const TASK_FOCUS_STORAGE_PREFIX = "deskii-task-focus";

export type TaskFocusMode = "pinned" | "auto" | "none";

export function getTaskFocusStorageKey(userId?: string | number | null): string {
  const suffix = userId == null || userId === "" ? "guest" : String(userId);
  return `${TASK_FOCUS_STORAGE_PREFIX}:${suffix}`;
}

export function getSuggestedFocusTask(tasks: Task[], today: string): Task | null {
  const openTasks = tasks.filter((task) => task.status !== "completed");

  return (
    openTasks.find((task) => Boolean(task.dueDate) && task.dueDate! < today)
    || openTasks.find((task) => task.dueDate === today)
    || openTasks.find((task) => task.status === "in_progress")
    || openTasks.find((task) => task.status === "review")
    || openTasks.find((task) => task.status === "todo")
    || null
  );
}

export function getSelectedFocusTask(
  tasks: Task[],
  suggestedTasks: Task[],
  pinnedTaskId: string | null,
  today: string,
): { task: Task | null; mode: TaskFocusMode } {
  if (pinnedTaskId) {
    const pinnedTask = tasks.find((task) => task.id === pinnedTaskId);
    if (pinnedTask) return { task: pinnedTask, mode: "pinned" };
  }

  const suggestedTask = getSuggestedFocusTask(suggestedTasks, today);
  if (suggestedTask) return { task: suggestedTask, mode: "auto" };

  return { task: null, mode: "none" };
}
