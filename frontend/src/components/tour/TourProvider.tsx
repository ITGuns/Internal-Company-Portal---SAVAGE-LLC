"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchSeenTours, markTourSeen, resetTours } from "@/lib/tour";

/**
 * Holds which guided tours this account has already been shown.
 *
 * Fetched once per session rather than per page, so moving around the portal
 * does not re-query, and a page can ask "should I run my tour?" synchronously.
 * Until the answer arrives, `ready` is false and no tour starts - showing a
 * guide to someone who has already dismissed it is the one failure worth
 * avoiding, so we wait rather than guess.
 */
interface TourContextValue {
  ready: boolean;
  seen: Set<string>;
  hasSeen: (key: string) => boolean;
  markSeen: (key: string) => void;
  replayAll: () => Promise<void>;
}

const TourContext = createContext<TourContextValue>({
  ready: false,
  seen: new Set(),
  hasSeen: () => true,
  markSeen: () => {},
  replayAll: async () => {},
});

export function TourProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const keys = await fetchSeenTours();
        if (!cancelled) setSeen(new Set(keys));
      } catch {
        // Signed out, offline, or the endpoint is unavailable. Treat everything
        // as already seen: a portal that silently skips its guide is fine, one
        // that reruns the guide on every page load is not.
        if (!cancelled) setSeen(new Set(["*"]));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSeen = useCallback(
    (key: string) => seen.has("*") || seen.has(key),
    [seen],
  );

  // Optimistic: the overlay closes immediately and the write happens behind it.
  const markSeen = useCallback((key: string) => {
    setSeen((current) => new Set(current).add(key));
    void markTourSeen(key).catch(() => {});
  }, []);

  const replayAll = useCallback(async () => {
    await resetTours();
    setSeen(new Set());
  }, []);

  const value = useMemo(
    () => ({ ready, seen, hasSeen, markSeen, replayAll }),
    [hasSeen, markSeen, ready, replayAll, seen],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTourState(): TourContextValue {
  return useContext(TourContext);
}

/**
 * Should this page run its tour right now?
 *
 * Returns false until the seen-set has loaded, and false forever once the tour
 * has been finished or skipped.
 */
export function useShouldRunTour(key: string): boolean {
  const { ready, hasSeen } = useTourState();
  return ready && !hasSeen(key);
}
