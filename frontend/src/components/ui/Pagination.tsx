"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  className?: string;
}

export default function Pagination({ page, totalPages, onPageChange, total, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      {total !== undefined && (
        <span className="text-xs text-[var(--muted)]">{total} total</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--card-surface)] disabled:cursor-not-allowed disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-[var(--muted)]">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-10 min-w-10 rounded-[var(--radius-md)] px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                p === page
                  ? "bg-[var(--accent)] text-white"
                  : "hover:bg-[var(--card-surface)] text-[var(--foreground)]"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--card-surface)] disabled:cursor-not-allowed disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
