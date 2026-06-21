/**
 * React Query hooks for time entries.
 * Uses 'time-entries' query key — automatically invalidated when
 * the backend emits a data:changed event for this resource.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchTimeEntries } from '@/lib/time-entries';

const QUERY_KEY = ['time-entries'] as const;

interface UseTimeEntriesOptions {
  enabled?: boolean;
}

export function useTimeEntries(startDate?: string, endDate?: string, userId?: string, options: UseTimeEntriesOptions = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, startDate, endDate, userId],
    queryFn: () => fetchTimeEntries(startDate, endDate, userId),
    enabled: options.enabled ?? true,
  });
}
