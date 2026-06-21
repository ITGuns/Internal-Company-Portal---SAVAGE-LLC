import { QueryClient } from '@tanstack/react-query';

export const DEFAULT_QUERY_STALE_MS = 2 * 60 * 1000;
export const DEFAULT_QUERY_GC_MS = 30 * 60 * 1000;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep route data fresh long enough that app-shell navigation does not feel like a full reload.
        staleTime: DEFAULT_QUERY_STALE_MS,
        // Keep unused route data around while users move between workspace sections.
        gcTime: DEFAULT_QUERY_GC_MS,
        // Mutations and socket invalidations keep important data current without focus-triggered churn.
        refetchOnWindowFocus: false,
        // Don't auto-retry on error (the apiFetch wrapper already handles 401 retries)
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Returns a singleton QueryClient for the browser.
 * Creates a new one per SSR request to avoid sharing state between users.
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client
    return makeQueryClient();
  }
  // Browser: reuse the same client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
