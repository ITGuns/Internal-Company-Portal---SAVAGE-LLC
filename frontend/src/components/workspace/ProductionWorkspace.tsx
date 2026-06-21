"use client";

import type React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceIcon = React.ComponentType<{ className?: string }>;

export type ProductionTone = "accent" | "success" | "info" | "warning" | "danger" | "neutral";

export interface ProductionMetricItem {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon?: WorkspaceIcon;
  tone?: ProductionTone;
}

const toneClasses: Record<ProductionTone, {
  text: string;
  soft: string;
  border: string;
}> = {
  accent: {
    text: "text-[var(--accent)]",
    soft: "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
    border: "border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]",
  },
  success: {
    text: "text-emerald-500",
    soft: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
  info: {
    text: "text-cyan-500",
    soft: "bg-cyan-500/10",
    border: "border-cyan-500/25",
  },
  warning: {
    text: "text-amber-500",
    soft: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
  danger: {
    text: "text-rose-500",
    soft: "bg-rose-500/10",
    border: "border-rose-500/25",
  },
  neutral: {
    text: "text-[var(--muted)]",
    soft: "bg-[var(--card-surface)]",
    border: "border-[var(--border)]",
  },
};

function MetricCell({ item, compact = false }: { item: ProductionMetricItem; compact?: boolean }) {
  const tone = item.tone || "accent";
  const Icon = item.icon;

  return (
    <div className={cn("min-w-0 border-l border-[var(--border)] pl-4 first:border-l-0 first:pl-0", compact && "border-l-0 pl-0")}>
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] border", toneClasses[tone].soft, toneClasses[tone].border)}>
            <Icon className={cn("h-3.5 w-3.5", toneClasses[tone].text)} />
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{item.label}</div>
          <div className={cn("mt-1 truncate font-semibold tabular-nums text-[var(--foreground)]", compact ? "text-lg" : "text-2xl")}>
            {item.value}
          </div>
        </div>
      </div>
      {item.caption ? <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{item.caption}</div> : null}
    </div>
  );
}

export function ProductionPanel({
  children,
  icon: Icon,
  title,
  eyebrow,
  count,
  action,
  className,
  bodyClassName,
  variant = "default",
}: {
  children: React.ReactNode;
  icon?: WorkspaceIcon;
  title: string;
  eyebrow?: string;
  count?: number | string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: "default" | "subtle" | "deep";
}) {
  const isDeep = variant === "deep";

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-sm)]",
        isDeep
          ? "border-[var(--workspace-ink-border)] bg-[var(--workspace-ink)] text-[var(--workspace-ink-foreground)]"
          : variant === "subtle"
            ? "border-[var(--border)] bg-[var(--surface-raised)]"
            : "border-[var(--border)] bg-[var(--card-bg)]",
        className,
      )}
    >
      <div className={cn("flex items-center justify-between gap-3 border-b px-4 py-3", isDeep ? "border-[var(--workspace-ink-border)]" : "border-[var(--border)]")}>
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border", isDeep ? "border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-soft)]" : "border-[var(--border)] bg-[var(--card-surface)]")}>
              <Icon className={cn("h-4 w-4", isDeep ? "text-[var(--workspace-ink-accent)]" : "text-[var(--accent)]")} />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <div className={cn("truncate text-[10px] font-semibold uppercase tracking-[0.1em]", isDeep ? "text-[var(--workspace-ink-muted)]" : "text-[var(--muted)]")}>{eyebrow}</div> : null}
            <h2 className="truncate text-sm font-semibold">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof count !== "undefined" ? (
            <span className={cn("rounded-full px-2 py-0.5 text-xs", isDeep ? "bg-[var(--workspace-ink-soft)] text-[var(--workspace-ink-foreground)]" : "bg-[var(--card-surface)] text-[var(--muted)]")}>
              {count}
            </span>
          ) : null}
          {action}
        </div>
      </div>
      <div className={cn("min-w-0 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function ProductionStatusHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  status,
  metrics,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon?: WorkspaceIcon;
  status?: React.ReactNode;
  metrics: ProductionMetricItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[var(--radius-md)] border border-[var(--workspace-ink-border)] bg-[var(--workspace-ink)] text-[var(--workspace-ink-foreground)] shadow-[var(--shadow-md)]", className)}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            {Icon ? (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-soft)]">
                <Icon className="h-5 w-5 text-[var(--workspace-ink-accent)]" />
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--workspace-ink-accent)]">
              {eyebrow}
            </span>
            {status}
          </div>
          <h1 className="mt-5 max-w-3xl text-2xl font-semibold leading-tight text-[var(--workspace-ink-foreground)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--workspace-ink-muted)] sm:text-base">
            {description}
          </p>
          {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        <div className="min-w-0 border-t border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-soft)] p-5 lg:border-l lg:border-t-0 sm:p-6">
          {children}
        </div>
      </div>

      <div className="grid gap-4 border-t border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-soft)] p-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 border-l border-[var(--workspace-ink-border)] pl-4 first:border-l-0 first:pl-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">{metric.label}</div>
            <div className="mt-1 truncate text-2xl font-semibold tabular-nums text-[var(--workspace-ink-foreground)]">{metric.value}</div>
            {metric.caption ? <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--workspace-ink-muted)]">{metric.caption}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductionMetricStrip({
  eyebrow,
  title,
  description,
  metrics,
  actionLabel,
  onAction,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metrics: ProductionMetricItem[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-sm)]", className)}>
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">{eyebrow}</div>
          <h2 className="mt-1 text-base font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCell key={metric.label} item={metric} />
          ))}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-3 text-sm font-medium transition-colors hover:border-[var(--muted)] hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function ProductionStatGrid({
  items,
  className,
  compact = false,
}: {
  items: ProductionMetricItem[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <section key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-sm)]">
          <MetricCell item={item} compact={compact} />
        </section>
      ))}
    </div>
  );
}
