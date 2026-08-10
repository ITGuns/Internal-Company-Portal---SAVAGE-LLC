"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { markTourSeen, type TourStep } from "@/lib/tour";

/**
 * A first-run guide: dim the page, highlight one thing at a time, say what it is
 * for in plain language.
 *
 * Built rather than pulled in - no tour library exists in this project, and the
 * whole surface is a spotlight, a tooltip and a keyboard handler.
 *
 * Rules it follows, because a first-run guide that misbehaves is worse than none:
 *   - a step whose anchor is not on the page is SKIPPED, never shown pointing at
 *     nothing. New clients have empty portals, so this is the normal case.
 *   - if no step survives, the tour marks itself seen and never appears again.
 *   - Escape leaves, and leaving counts as seen. Nobody is trapped.
 *   - it waits for its anchors to exist before the first paint, so it cannot
 *     flash in the corner while the page is still loading.
 */
export default function GuidedTour({
  tourKey,
  steps,
  open,
  onClose,
}: {
  tourKey: string;
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [live, setLive] = useState<TourStep[]>([]);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Keep only steps whose anchor is actually on the page.
  useEffect(() => {
    if (!open) return;
    const present = steps.filter(
      (step) => !step.selector || document.querySelector(step.selector),
    );
    setLive(present);
    setIndex(0);
  }, [open, steps]);

  const step = live[index];

  const finish = useCallback(() => {
    // Record before closing: a client who leaves immediately still should not be
    // shown this again. A failure here is silent by design - being taught twice
    // is a far smaller harm than an error dialog on someone's first minute.
    void markTourSeen(tourKey).catch(() => {});
    onClose();
  }, [onClose, tourKey]);

  // Nothing to point at: retire the tour rather than showing an empty shell.
  useEffect(() => {
    if (open && live.length === 0) finish();
  }, [finish, live.length, open]);

  const measure = useCallback(() => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = step.selector ? document.querySelector(step.selector) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Measure after the scroll settles, so the spotlight lands on the final position.
    const timer = window.setTimeout(measure, 220);
    return () => window.clearTimeout(timer);
  }, [measure, open, step]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, live.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    cardRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, live.length, open]);

  if (!open || !step) return null;

  const isLast = index === live.length - 1;
  const pad = 8;

  // Anchored steps sit under their target where there is room, otherwise above.
  // Unanchored steps are centred.
  const placeBelow = rect ? rect.bottom + 180 < window.innerHeight : true;
  const cardStyle: React.CSSProperties = rect
    ? {
      position: "fixed",
      top: placeBelow ? rect.bottom + pad + 8 : undefined,
      bottom: placeBelow ? undefined : window.innerHeight - rect.top + pad + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 380)),
      width: 340,
    }
    : {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 360,
    };

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Getting started guide">
      {/* Dimmer. A ring around the target rather than a cut-out, so the element
          underneath stays fully readable and clickable-looking. */}
      <div className="absolute inset-0 bg-black/55" onClick={finish} />

      {rect ? (
        <div
          className="pointer-events-none absolute rounded-[var(--radius-md)] ring-2 ring-[var(--accent)]"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : null}

      <div
        ref={cardRef}
        tabIndex={-1}
        style={cardStyle}
        className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-md)] outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-[var(--foreground)]">{step.title}</div>
          <button
            type="button"
            onClick={finish}
            aria-label="Close the guide"
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-[var(--muted)]">
            {index + 1} of {live.length}
          </span>
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="min-h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm hover:bg-[var(--surface-hover)]"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="min-h-9 rounded-[var(--radius-md)] px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
              className="min-h-9 rounded-[var(--radius-md)] bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-95"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
