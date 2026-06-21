import type { AnnouncementCategory, KnownAnnouncementCategory } from "./announcements";

export type AnnouncementFilterCategory = "all" | AnnouncementCategory;

export interface AnnouncementFilterOption {
  value: AnnouncementCategory;
  label: string;
  description: string;
  isCustom?: boolean;
}

interface AnnouncementFilterable {
  category: AnnouncementCategory;
}

export const KNOWN_ANNOUNCEMENT_CATEGORIES: KnownAnnouncementCategory[] = [
  "company-news",
  "shoutouts",
  "events",
  "birthdays",
];

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

const ANNOUNCEMENT_FILTER_VALUES = new Set<AnnouncementFilterCategory>(["all", ...KNOWN_ANNOUNCEMENT_CATEGORIES]);

export function formatAnnouncementCategoryLabel(category: AnnouncementCategory): string {
  const knownLabel = ANNOUNCEMENT_FILTER_OPTIONS.find((option) => option.value === category)?.label;
  if (knownLabel) return knownLabel;

  return String(category)
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Custom";
}

export function normalizeCustomAnnouncementCategory(value: string): AnnouncementCategory {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function buildAnnouncementFilterOptions<T extends AnnouncementFilterable>(
  announcements: T[],
): AnnouncementFilterOption[] {
  const knownValues = new Set(ANNOUNCEMENT_FILTER_OPTIONS.map((option) => option.value));
  const customCategories = Array.from(new Set(
    announcements
      .map((announcement) => announcement.category)
      .filter((category) => category && !knownValues.has(category)),
  ))
    .map((category) => normalizeCustomAnnouncementCategory(category))
    .filter(Boolean)
    .sort((first, second) => formatAnnouncementCategoryLabel(first).localeCompare(formatAnnouncementCategoryLabel(second)));

  return [
    ...ANNOUNCEMENT_FILTER_OPTIONS,
    ...customCategories.map((category) => ({
      value: category,
      label: formatAnnouncementCategoryLabel(category),
      description: "Custom type",
      isCustom: true,
    })),
  ];
}

function announcementCategoryMatches(category: AnnouncementCategory, filter: AnnouncementFilterCategory): boolean {
  if (category === filter) return true;
  return normalizeCustomAnnouncementCategory(category) === filter;
}

export function getAnnouncementFilterFromSearch(searchParams: URLSearchParams): AnnouncementFilterCategory {
  const requestedFilter = searchParams.get("category")?.trim() as AnnouncementFilterCategory | undefined;
  if (!requestedFilter) return "all";
  if (ANNOUNCEMENT_FILTER_VALUES.has(requestedFilter)) return requestedFilter;
  return normalizeCustomAnnouncementCategory(requestedFilter) || "all";
}

export function filterAnnouncementsByCategory<T extends AnnouncementFilterable>(
  announcements: T[],
  filter: AnnouncementFilterCategory,
): T[] {
  if (filter === "all") return announcements;
  return announcements.filter((announcement) => announcementCategoryMatches(announcement.category, filter));
}

export function countAnnouncementsByCategory<T extends AnnouncementFilterable>(
  announcements: T[],
  category: AnnouncementCategory,
): number {
  return announcements.filter((announcement) => announcementCategoryMatches(announcement.category, category)).length;
}
