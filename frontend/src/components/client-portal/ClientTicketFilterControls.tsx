"use client";

import { Search, X } from "lucide-react";
import {
  DEFAULT_CLIENT_TICKET_FILTERS,
  ClientTicketFilters,
} from "@/lib/client-ticket-filters";
import {
  CLIENT_TICKET_CATEGORIES,
  CLIENT_TICKET_PRIORITIES,
  CLIENT_TICKET_STATUSES,
} from "@/lib/client-portal-options";

const selectClass = "min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open requests" },
  ...CLIENT_TICKET_STATUSES.map((status) => ({ value: status.value, label: status.label })),
];

const priorityOptions = [
  { value: "all", label: "All priorities" },
  ...CLIENT_TICKET_PRIORITIES.map((priority) => ({ value: priority.value, label: priority.label })),
];

const categoryOptions = [
  { value: "all", label: "All types" },
  ...CLIENT_TICKET_CATEGORIES.map((category) => ({ value: category.value, label: category.label })),
];

interface ClientTicketFilterControlsProps {
  filters: ClientTicketFilters;
  resultSummary: string;
  onChange: (filters: ClientTicketFilters) => void;
}

export default function ClientTicketFilterControls({
  filters,
  resultSummary,
  onChange,
}: ClientTicketFilterControlsProps) {
  const hasActiveFilters = filters.query.trim()
    || filters.status !== "all"
    || filters.priority !== "all"
    || filters.category !== "all";

  function updateFilter(key: keyof ClientTicketFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Find requests</div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>{resultSummary}</span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_CLIENT_TICKET_FILTERS)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1 font-medium transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <label className="relative block sm:col-span-2">
          <span className="sr-only">Search requests</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Search title, details, or comments"
            className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] pl-9 pr-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </label>

        <select className={selectClass} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} aria-label="Filter requests by status">
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select className={selectClass} value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)} aria-label="Filter requests by priority">
          {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select className={selectClass} value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} aria-label="Filter requests by request type">
          {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    </div>
  );
}
