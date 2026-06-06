import { QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 30 seconds — no background refetch within this window
        staleTime: 30 * 1000,
        // Keep unused cache entries for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Refetch when user returns to the tab
        refetchOnWindowFocus: true,
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
