/**
 * Polling fallback for when realtime is off. Production runs on Vercel functions,
 * which cannot hold a Socket.io connection, so nothing pushes chat messages,
 * notifications or `data:changed` invalidations there.
 * Pure helpers with no runtime imports so node --test can load this file directly.
 */

/** Poll interval in milliseconds, or false when the socket delivers updates instead. */
export function getFallbackPollInterval(realtimeEnabled: boolean, intervalMs: number): number | false {
  return realtimeEnabled ? false : intervalMs;
}

/**
 * React Query options for list queries (tasks, announcements, daily logs).
 * React Query skips interval refetches while the tab is hidden
 * (refetchIntervalInBackground defaults to false).
 */
export function getFallbackListQueryOptions(realtimeEnabled: boolean, intervalMs: number) {
  return {
    refetchOnWindowFocus: !realtimeEnabled,
    refetchInterval: getFallbackPollInterval(realtimeEnabled, intervalMs),
  };
}

export function describePollInterval(intervalMs: number): string {
  return `Updates every ${Math.round(intervalMs / 1000)} seconds`;
}
