import type { AnnouncementCategory } from "./announcements";

export type AnnouncementFilterCategory = "all" | AnnouncementCategory;

export interface AnnouncementFilterOption {
  value: AnnouncementCategory;
  label: string;
  description: string;
}

interface AnnouncementFilterable {
  category: AnnouncementCategory;
}

export const ANNOUNCEMENT_FILTER_OPTIONS: AnnouncementFilterOption[] = [
  {
    value: "company-news",
    label: "Company News",
    description: "Important updates",
  },
  {
    value: "shoutouts",
    label: "Shoutouts",
    description: "Celebrate success",
  },
  {
    value: "events",
    label: "Events",
    description: "Upcoming activities",
  },
  {
    value: "birthdays",
    label: "Birthdays",
    description: "Celebrate team",
  },
];

const ANNOUNCEMENT_FILTER_VALUES = new Set<AnnouncementFilterCategory>([
  "all",
  ...ANNOUNCEMENT_FILTER_OPTIONS.map((option) => option.value),
]);

export function getAnnouncementFilterFromSearch(searchParams: URLSearchParams): AnnouncementFilterCategory {
  const requestedFilter = searchParams.get("category")?.trim() as AnnouncementFilterCategory | undefined;
  return requestedFilter && ANNOUNCEMENT_FILTER_VALUES.has(requestedFilter) ? requestedFilter : "all";
}

export function filterAnnouncementsByCategory<T extends AnnouncementFilterable>(
  announcements: T[],
  filter: AnnouncementFilterCategory,
): T[] {
  if (filter === "all") return announcements;
  return announcements.filter((announcement) => announcement.category === filter);
}

export function countAnnouncementsByCategory<T extends AnnouncementFilterable>(
  announcements: T[],
  category: AnnouncementCategory,
): number {
  return announcements.filter((announcement) => announcement.category === category).length;
}
