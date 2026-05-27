export interface PlanningRoadmapItem {
  id: string;
  status: string;
  updatedAt?: string | null;
}

export interface PlanningCalendarItem {
  id: string;
  title: string;
  status: string;
  startAt?: string | null;
  endAt?: string | null;
  channel?: string | null;
  visibleToClient?: boolean;
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

export function buildClientCalendarEvents<T extends PlanningCalendarItem>(items: T[]) {
  return items
    .filter((item) => item.status !== "archived" && Boolean(item.startAt))
    .map((item) => {
      const color = CALENDAR_STATUS_COLORS[item.status] || CALENDAR_STATUS_COLORS.planned;
      return {
        id: item.id,
        title: item.title,
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
