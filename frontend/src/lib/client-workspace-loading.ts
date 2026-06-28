export function getSettledClientLoadValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  onRejected?: (reason: unknown) => void,
): T {
  if (result.status === "fulfilled") {
    return result.value;
  }

  onRejected?.(result.reason);
  return fallback;
}
