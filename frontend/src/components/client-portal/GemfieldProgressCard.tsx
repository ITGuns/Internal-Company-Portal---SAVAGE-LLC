"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2, Rocket } from "lucide-react";
import { ProductionPanel } from "@/components/workspace/ProductionWorkspace";
import { fetchGemfieldProgress, type GemfieldProject } from "@/lib/gemfield";

// Client-facing build timeline for entitled (Gemfield) organizations. Render this only when the
// organization is entitled; it returns null when there is nothing to show, so it stays absent
// (never a grayed-out shell) for orgs without an active build.

type PhaseState = "done" | "current" | "upcoming";

function phaseState(project: GemfieldProject, phaseIndex: number): PhaseState {
  const currentIndex = project.phases.findIndex((phase) => phase.phase === project.currentPhase);
  if (currentIndex < 0) return "upcoming";
  if (phaseIndex < currentIndex) return "done";
  if (phaseIndex === currentIndex) return "current";
  return "upcoming";
}

function noteForPhase(project: GemfieldProject, phase: string): string | null {
  const milestone = project.milestones.find((entry) => entry.phase === phase);
  return milestone?.note ?? null;
}

function ProjectTimeline({ project }: { project: GemfieldProject }) {
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{project.name}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {project.currentPhaseLabel ? `Currently: ${project.currentPhaseLabel}` : "We're getting started."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.stagingUrl ? (
            <a
              href={project.stagingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--card-bg)]"
            >
              Preview <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--card-bg)]"
            >
              Visit live site <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {project.phases.map((phase, index) => {
          const state = phaseState(project, index);
          const note = state === "current" ? noteForPhase(project, phase.phase) : null;
          return (
            <li key={phase.phase} className="flex items-start gap-2.5">
              {state === "done" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
              ) : state === "current" ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
              )}
              <div className="min-w-0">
                <p
                  className={
                    state === "upcoming"
                      ? "text-sm text-[var(--muted)]"
                      : "text-sm font-medium text-[var(--foreground)]"
                  }
                >
                  {phase.label}
                  {state === "current" ? (
                    <span className="ml-2 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      In progress
                    </span>
                  ) : null}
                </p>
                {note ? <p className="mt-0.5 text-sm leading-6 text-[var(--muted)]">{note}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export default function GemfieldProgressCard({ organizationId }: { organizationId: string }) {
  const [projects, setProjects] = useState<GemfieldProject[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    setProjects(null);
    setErrored(false);
    fetchGemfieldProgress(organizationId)
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch(() => {
        if (active) setErrored(true);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  // Absent until there is something to show (no grayed-out shell).
  if (errored) return null;
  if (projects && projects.length === 0) return null;

  return (
    <ProductionPanel title="Your website build" eyebrow="Live status" icon={Rocket}>
      {!projects ? (
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your build status…
        </p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectTimeline key={project.id} project={project} />
          ))}
        </div>
      )}
    </ProductionPanel>
  );
}
