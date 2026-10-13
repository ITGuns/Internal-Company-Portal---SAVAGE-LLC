/**
 * Wraps an async action so concurrent calls share one in-flight promise.
 * A second click, or a second mounted widget, joins the pending request
 * instead of sending a duplicate. The next call after it settles runs fresh.
 */
export function singleFlight<T>(action: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (!inFlight) {
      inFlight = action().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}
