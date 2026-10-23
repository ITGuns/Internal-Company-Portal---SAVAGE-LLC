"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, PlayCircle, Sparkles, X } from "lucide-react";
import { useTourState } from "./TourProvider";
import { CHECKLIST_TOUR_KEY, CLIENT_CHECKLIST } from "@/lib/client-tours";

/**
 * The get-started checklist on the command centre.
 *
 * Exists because the page tours are one-shot: they teach you what a screen is
 * while you are on it, then get out of the way forever. This is the part a
 * client can come back to - what to do next, and a way to replay the guides.
 *
 * Ticks are derived from the same per-account tour state, so "See where your
 * build is" checks itself off once they have actually been shown it. Nothing
 * here is a separate thing to keep in sync.
 */
export default function GettingStartedChecklist() {
  const { ready, hasSeen, markSeen, replayAll } = useTourState();
  const [dismissed, setDismissed] = useState(false);
  const [replaying, setReplaying] = useState(false);

  // Hidden once dismissed, and hidden entirely for anyone who has been here
  // long enough to have finished the guides.
  if (!ready || dismissed || hasSeen(CHECKLIST_TOUR_KEY)) return null;

  const done = CLIENT_CHECKLIST.filter((item) => hasSeen(`client.${item.key}`)).length;

  return (
    <section
      data-tour-panel="Getting started"
      className="rounded-[var(--radius-md)] border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4"
      aria-label="Getting started"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Getting started</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Four things worth doing while we get to work on your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={replaying}
            onClick={async () => {
              setReplaying(true);
              try {
                await replayAll();
              } finally {
                setReplaying(false);
              }
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {replaying ? "Resetting..." : "Replay the guide"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              markSeen(CHECKLIST_TOUR_KEY);
            }}
            aria-label="Hide getting started"
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ol className="mt-3 space-y-1.5">
        {CLIENT_CHECKLIST.map((item) => {
          const complete = hasSeen(`client.${item.key}`);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => markSeen(`client.${item.key}`)}
                className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-transparent px-2 py-2 hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    complete
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {complete ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium ${
                      complete ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="block text-xs text-[var(--muted)]">{item.hint}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 px-2 text-xs text-[var(--muted)]">
        {done} of {CLIENT_CHECKLIST.length} done
      </p>
    </section>
  );
}
