/**
 * Category chips for Employee Overview (2026-10-28): All plus each employment
 * type from Payroll options, with how many deployed employees have it. The
 * category itself is set in Set up payroll (Employment type).
 */

import React from "react";
import { ALL_CATEGORIES, type CategoryCount } from "@/lib/employee-history";

interface EmployeeCategoryFilterProps {
  counts: CategoryCount[];
  total: number;
  value: string;
  onChange: (value: string) => void;
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${active
        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--foreground)]"
        : "border-[var(--border)] bg-[var(--card-surface)] text-[var(--muted)] hover:border-[var(--accent)]/60 hover:text-[var(--foreground)]"
        }`}
    >
      {label}
      <span className={`font-mono text-xs tabular-nums ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{count}</span>
    </button>
  );
}

export default function EmployeeCategoryFilter({ counts, total, value, onChange }: EmployeeCategoryFilterProps) {
  return (
    <div role="group" aria-label="Filter employees by category" className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium text-[var(--muted)]">Category</span>
      <Chip label="All" count={total} active={value === ALL_CATEGORIES} onClick={() => onChange(ALL_CATEGORIES)} />
      {counts.map((entry) => (
        <Chip key={entry.value} label={entry.label} count={entry.count} active={value === entry.value} onClick={() => onChange(entry.value)} />
      ))}
    </div>
  );
}
