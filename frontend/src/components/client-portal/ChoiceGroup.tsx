"use client";

import { ClientPortalOption } from "@/lib/client-portal-options";
import { cn } from "@/lib/utils";

interface ChoiceGroupProps {
  label: string;
  options: ClientPortalOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: "two" | "three";
  variant?: "cards" | "pills";
  showDescription?: boolean;
}

export default function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  columns = "two",
  variant = "cards",
  showDescription = true,
}: ChoiceGroupProps) {
  const isPillVariant = variant === "pills";

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[var(--foreground)]">{label}</legend>
      <div className={cn(isPillVariant ? "flex flex-wrap gap-2" : "grid gap-2", !isPillVariant && (columns === "three" ? "sm:grid-cols-3" : "sm:grid-cols-2"))}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                isPillVariant
                  ? "rounded-full border px-3 py-1.5 text-left text-sm transition-colors"
                  : "min-h-16 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                selected
                  ? "border-[var(--accent)] bg-[var(--card-surface)] text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
              )}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              {!isPillVariant && showDescription && option.description ? (
                <span className="mt-1 block text-xs leading-4 text-[var(--muted)]">{option.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
