"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleDot, Rocket, Send } from "lucide-react";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import { fetchGemfieldProgress, type GemfieldProject } from "@/lib/gemfield";
import { setGemfieldProjectPhase } from "@/lib/gemfield-admin";
import ClientOperationsPanel, {
  clientOperationsSelectClass,
  clientOperationsTextareaClass,
} from "./ClientOperationsPanel";

/**
 * Staff control for the Gemfield build phase - the same timeline the client
 * watches on their portal.
 *
 * The backend route has existed since the bridge shipped; nothing in the UI ever
 * called it, so advancing a client's build meant running the HMAC-signed push
 * script from a terminal. This is that endpoint, in the product.
 *
 * The phase list is not hardcoded here: it comes back from the progress API per
 * project (`phases`), so it cannot drift from GEMFIELD_PHASES on the server.
 */
export default function GemfieldPhaseControl({ organizationId }: { organizationId: string }) {
  const toast = useToast();
  const [projects, setProjects] = useState<GemfieldProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, { stagingUrl: string; liveUrl: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await fetchGemfieldProgress(organizationId));
    } catch {
      // A non-entitled org 404s here; the caller gates on gemfieldClient, so this
      // is a genuine failure worth surfacing rather than swallowing.
      toast.error("Could not load build progress");
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyPhase(project: GemfieldProject, phase: string) {
    setBusyId(project.id);
    try {
      const note = (notes[project.id] || "").trim();
      const extra = urls[project.id] || { stagingUrl: "", liveUrl: "" };
      await setGemfieldProjectPhase(organizationId, project.id, {
        phase,
        ...(note ? { note } : {}),
        ...(extra.stagingUrl.trim() ? { stagingUrl: extra.stagingUrl.trim() } : {}),
        ...(extra.liveUrl.trim() ? { liveUrl: extra.liveUrl.trim() } : {}),
      });
      setNotes((current) => ({ ...current, [project.id]: "" }));
      setUrls((current) => ({ ...current, [project.id]: { stagingUrl: "", liveUrl: "" } }));
      toast.success("Build phase updated - the client sees this now");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the phase");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ClientOperationsPanel icon={Rocket} title="Website Build Phase" count={projects.length}>
      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading build progress...</div>
      ) : projects.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={Rocket}
          title="No Gemfield build yet"
          description="A project appears here once the client completes their intake."
        />
      ) : (
        <div className="space-y-5">
          {projects.map((project) => {
            const reached = new Set(project.milestones.map((milestone) => milestone.phase));
            const currentIndex = project.phases.findIndex((entry) => entry.phase === project.currentPhase);
            const next = currentIndex >= 0 ? project.phases[currentIndex + 1] : project.phases[0];
            const busy = busyId === project.id;
            const draft = urls[project.id] || { stagingUrl: "", liveUrl: "" };

            return (
              <article key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{project.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-[var(--muted)]">{project.gfId || "no GF-ID"}</div>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Now: <span className="font-semibold text-[var(--accent)]">{project.currentPhaseLabel || "not started"}</span>
                  </div>
                </div>

                {/* The client's timeline, as staff see it. Reached phases are filled. */}
                <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Build phases">
                  {project.phases.map((entry) => {
                    const done = reached.has(entry.phase);
                    const isCurrent = entry.phase === project.currentPhase;
                    return (
                      <li key={entry.phase}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => applyPhase(project, entry.phase)}
                          title={
                            done
                              ? `Re-record ${entry.label}`
                              : `Set this build to ${entry.label}`
                          }
                          className={[
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                            "motion-interactive disabled:opacity-50",
                            "focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                            isCurrent
                              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                              : done
                                ? "border-[var(--border)] bg-[var(--card-surface)] text-[var(--foreground)]"
                                : "border-dashed border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)]",
                          ].join(" ")}
                        >
                          {isCurrent ? (
                            <CircleDot className="h-3 w-3" aria-hidden="true" />
                          ) : done ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : null}
                          <span>{entry.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-[var(--muted)]" htmlFor={`note-${project.id}`}>
                    Note to the client (optional)
                  </label>
                  <textarea
                    id={`note-${project.id}`}
                    className={clientOperationsTextareaClass}
                    rows={2}
                    placeholder="e.g. Homepage draft is ready for your review."
                    value={notes[project.id] || ""}
                    disabled={busy}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [project.id]: event.target.value }))
                    }
                  />
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    This note is <strong>visible to the client</strong> - it becomes the body of their
                    build update. Keep internal detail out of it.
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className={clientOperationsSelectClass}
                      placeholder="Staging URL (optional)"
                      value={draft.stagingUrl}
                      disabled={busy}
                      onChange={(event) =>
                        setUrls((current) => ({
                          ...current,
                          [project.id]: { ...draft, stagingUrl: event.target.value },
                        }))
                      }
                    />
                    <input
                      className={clientOperationsSelectClass}
                      placeholder="Live URL (optional)"
                      value={draft.liveUrl}
                      disabled={busy}
                      onChange={(event) =>
                        setUrls((current) => ({
                          ...current,
                          [project.id]: { ...draft, liveUrl: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {next ? (
                    <Button
                      type="button"
                      onClick={() => applyPhase(project, next.phase)}
                      disabled={busy}
                      icon={<Send className="h-4 w-4" aria-hidden="true" />}
                    >
                      {busy ? "Updating..." : `Advance to ${next.label}`}
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-[var(--muted)]">
                      Final phase reached - this build is live.
                    </span>
                  )}
                  <span className="text-xs text-[var(--muted)]">
                    Phases only move forward; picking an earlier one records that milestone without
                    rewinding the build.
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ClientOperationsPanel>
  );
}
