"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GuidedTour from "./GuidedTour";
import { useTourState } from "./TourProvider";
import { tourForPath } from "@/lib/client-tours";

/**
 * Runs the right get-started guide for whichever client page you are on, the
 * first time you open it.
 *
 * Mounted once in the client portal frame rather than per page, so every route
 * is covered and no page has to remember to opt in.
 *
 * It waits for the page's own content before starting. A brand-new client's
 * portal renders a skeleton first, and every anchor is missing during that
 * window - starting early would silently drop most steps and teach nothing.
 */
export default function ClientTourRunner() {
  const pathname = usePathname() || "";
  const { ready, hasSeen, markSeen } = useTourState();
  const [open, setOpen] = useState(false);
  const [armedFor, setArmedFor] = useState<string | null>(null);

  const tour = tourForPath(pathname);

  useEffect(() => {
    setOpen(false);
    setArmedFor(null);
  }, [pathname]);

  useEffect(() => {
    if (!tour || !ready || hasSeen(tour.key) || armedFor === tour.key) return;

    let cancelled = false;
    let attempts = 0;

    // Poll briefly for the first anchor to exist. Cheap, and far more robust
    // than guessing a fixed delay against a data fetch of unknown length.
    const tick = () => {
      if (cancelled) return;
      attempts += 1;
      const anchored = tour.steps.find((step) => step.selector);
      const present = !anchored || document.querySelector(anchored.selector as string);
      if (present) {
        setArmedFor(tour.key);
        setOpen(true);
        return;
      }
      // ~6s of patience, then give up quietly rather than ambushing them later.
      if (attempts < 40) window.setTimeout(tick, 150);
    };

    const timer = window.setTimeout(tick, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [armedFor, hasSeen, ready, tour]);

  if (!tour) return null;

  return (
    <GuidedTour
      tourKey={tour.key}
      steps={tour.steps}
      open={open}
      onClose={() => {
        setOpen(false);
        markSeen(tour.key);
      }}
    />
  );
}
