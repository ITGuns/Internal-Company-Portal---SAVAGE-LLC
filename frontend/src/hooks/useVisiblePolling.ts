import { useEffect, useEffectEvent } from 'react';

/**
 * Calls `poll` every `intervalMs` while the tab is visible, and once more as soon as a hidden
 * tab becomes visible again (the plain-fetch version of React Query's refetchOnWindowFocus).
 * Pass false to switch it off, for example when realtime delivers the updates.
 */
export function useVisiblePolling(poll: () => void, intervalMs: number | false): void {
  const onPoll = useEffectEvent(poll);

  useEffect(() => {
    if (!intervalMs) return;

    const pollWhenVisible = () => {
      if (document.visibilityState === 'visible') onPoll();
    };
    const intervalId = window.setInterval(pollWhenVisible, intervalMs);
    document.addEventListener('visibilitychange', pollWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', pollWhenVisible);
    };
  }, [intervalMs]);
}
