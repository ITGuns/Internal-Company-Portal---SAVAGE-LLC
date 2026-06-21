interface ProjectMetricProps {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "success";
}

export default function ProjectOverviewMetric({ label, value, tone = "default" }: ProjectMetricProps) {
  const toneClass = tone === "warning"
    ? "text-amber-300"
    : tone === "success"
      ? "text-emerald-300"
      : "text-[var(--foreground)]";

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase text-[var(--muted)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
