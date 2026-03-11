import { useState, useEffect } from "react";

/**
 * Returns the live elapsed seconds for a task timer.
 * When the timer is "playing", it ticks every second.
 * Otherwise it returns the stored totalElapsed.
 */
export function useLiveElapsed(
  timerStatus: string | undefined,
  timerStart: string | undefined,
  totalElapsed: number
): number {
  const [liveElapsed, setLiveElapsed] = useState(totalElapsed);

  useEffect(() => {
    if (timerStatus !== "playing" || !timerStart) {
      setLiveElapsed(totalElapsed);
      return;
    }

    const startMs = new Date(timerStart).getTime();

    function tick() {
      const additionalSecs = Math.floor((Date.now() - startMs) / 1000);
      setLiveElapsed(totalElapsed + additionalSecs);
    }

    tick(); // initial computation
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerStatus, timerStart, totalElapsed]);

  return liveElapsed;
}
