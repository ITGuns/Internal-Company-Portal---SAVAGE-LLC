"use client";

import { getClientTicketDetailPresets } from "@/lib/client-portal-options";

interface TicketDetailPresetsProps {
  category: string;
  onSelect: (detail: string) => void;
}

export default function TicketDetailPresets({ category, onSelect }: TicketDetailPresetsProps) {
  const presets = getClientTicketDetailPresets(category);
  if (presets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={`${preset.category}-${preset.label}`}
          type="button"
          onClick={() => onSelect(preset.detail)}
          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
