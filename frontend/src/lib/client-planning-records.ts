export interface PlanningRoadmapItem {
  id: string;
  status: string;
  updatedAt?: string | null;
}

export interface PlanningCalendarItem {
  id: string;
  title: string;
  status: string;
  projectId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  channel?: string | null;
  visibleToClient?: boolean;
}

export interface PlanningProjectProgress {
  id: string;
  name: string;
  status: string;
  progress: number;
}

export interface PlanningWorkItemProgress {
  projectId?: string | null;
  status: string;
  progress?: number | null;
  visibleToClient?: boolean;
}

export interface ClientProjectProgressSummary {
  projectCount: number;
  activeProjectCount: number;
  averageProgress: number;
  workItemCount: number;
  completedWorkItemCount: number;
}

export const ROADMAP_BOARD_STATUSES = [
  { value: "recommended", label: "Recommended" },
  { value: "next", label: "Next" },
  { value: "planned", label: "Planned" },
  { value: "done", label: "Done" },
  { value: "archived", label: "History" },
] as const;

const CALENDAR_STATUS_COLORS: Record<string, string> = {
  planned: "#2563eb",
  scheduled: "#7c3aed",
  published: "#059669",
  cancelled: "#dc2626",
  archived: "#6b7280",
};

export function splitRoadmapItemsByStatus<T extends PlanningRoadmapItem>(items: T[]) {
  return ROADMAP_BOARD_STATUSES.map((status) => ({
    ...status,
    items: items.filter((item) => item.status === status.value),
  }));
}

export function sortCalendarItemsByStart<T extends PlanningCalendarItem>(items: T[]): T[] {
  return [...items].sort((first, second) => {
    const firstTime = first.startAt ? new Date(first.startAt).getTime() : Number.MAX_SAFE_INTEGER;
    const secondTime = second.startAt ? new Date(second.startAt).getTime() : Number.MAX_SAFE_INTEGER;
    return firstTime - secondTime;
  });
}

function normalizeProgress(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getProjectProgressForCalendarItem<T extends PlanningCalendarItem, P extends PlanningProjectProgress>(
  item: T,
  projects: P[] = [],
): P | null {
  if (!item.projectId) return null;
  return projects.find((project) => project.id === item.projectId) || null;
}

export function summarizeClientProjectProgress(
  projects: PlanningProjectProgress[] = [],
  workItems: PlanningWorkItemProgress[] = [],
): ClientProjectProgressSummary {
  const activeProjects = projects.filter((project) => !["live", "paused", "archived"].includes(project.status));
  const totalProgress = projects.reduce((sum, project) => sum + normalizeProgress(project.progress), 0);
  const averageProgress = projects.length ? Math.round(totalProgress / projects.length) : 0;
  const completedWorkItemCount = workItems.filter((item) => item.status === "completed").length;

  return {
    projectCount: projects.length,
    activeProjectCount: activeProjects.length,
    averageProgress,
    workItemCount: workItems.length,
    completedWorkItemCount,
  };
}

export function buildClientCalendarEvents<T extends PlanningCalendarItem>(
  items: T[],
  projects: PlanningProjectProgress[] = [],
) {
  return items
    .filter((item) => item.status !== "archived" && Boolean(item.startAt))
    .map((item) => {
      const color = CALENDAR_STATUS_COLORS[item.status] || CALENDAR_STATUS_COLORS.planned;
      const project = getProjectProgressForCalendarItem(item, projects);
      const projectProgress = project ? normalizeProgress(project.progress) : null;
      return {
        id: item.id,
        title: project ? `${item.title} · ${projectProgress}%` : item.title,
        start: item.startAt?.slice(0, 10) || undefined,
        end: item.endAt?.slice(0, 10) || undefined,
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          itemId: item.id,
          status: item.status,
          channel: item.channel || "general",
          visibleToClient: item.visibleToClient !== false,
          projectId: item.projectId || null,
          projectName: project?.name || null,
          projectProgress,
        },
      };
    });
}

export function createCalendarDateDraft(dateStr: string) {
  return {
    startAt: dateStr,
    endAt: "",
  };
}
