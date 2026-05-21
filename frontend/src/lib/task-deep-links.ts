export type TaskDeepLinkFilter = "overdue" | "in_progress";

export interface TaskDeepLinkState {
  filter: TaskDeepLinkFilter | null;
  taskId: string | null;
}

interface FilterableTask {
  status: string;
  dueDate?: string | null;
}

const TASK_FILTERS = new Set<TaskDeepLinkFilter>(["overdue", "in_progress"]);

const TASK_FILTER_LABELS: Record<TaskDeepLinkFilter, string> = {
  overdue: "Overdue tasks",
  in_progress: "In-progress tasks",
};

const TASK_FILTER_DESCRIPTIONS: Record<TaskDeepLinkFilter, string> = {
  overdue: "Showing unfinished tasks past their due date.",
  in_progress: "Showing active work already in progress.",
};

export function getTaskDeepLinkState(searchParams: URLSearchParams): TaskDeepLinkState {
  const requestedFilter = searchParams.get("filter") as TaskDeepLinkFilter | null;
  const taskId = searchParams.get("task")?.trim() || null;

  return {
    filter: requestedFilter && TASK_FILTERS.has(requestedFilter) ? requestedFilter : null,
    taskId,
  };
}

export function taskMatchesDeepLinkFilter(
  task: FilterableTask,
  filter: TaskDeepLinkFilter | null,
  todayDate: string,
) {
  if (!filter) return true;

  if (filter === "in_progress") {
    return task.status === "in_progress";
  }

  if (filter === "overdue") {
    return task.status !== "completed" && Boolean(task.dueDate) && String(task.dueDate) < todayDate;
  }

  return true;
}

export function getTaskFilterLabel(filter: TaskDeepLinkFilter | null): string | null {
  return filter ? TASK_FILTER_LABELS[filter] : null;
}

export function getTaskFilterDescription(filter: TaskDeepLinkFilter | null): string | null {
  return filter ? TASK_FILTER_DESCRIPTIONS[filter] : null;
}

export function getTaskUrlWithoutDeepLinkFilter(searchParams: URLSearchParams): string {
  const pairs: string[] = [];
  searchParams.forEach((value, key) => {
    if (key === "filter") return;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  const query = pairs.join("&");
  return query ? `/task-tracking?${query}` : "/task-tracking";
}
