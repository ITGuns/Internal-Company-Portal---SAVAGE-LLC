/**
 * React Query hooks for daily logs.
 * Uses 'daily-logs' query key — automatically invalidated when
 * the backend emits a data:changed event for this resource.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APP_CONFIG } from '@/lib/config';
import { getFallbackListQueryOptions } from '@/lib/realtime-fallback';
import {
  fetchDailyLogs,
  fetchMyDailyLogs,
  fetchDailyLogsPaginated,
  createDailyLog,
  updateDailyLog,
  deleteDailyLog,
  toggleLogLike,
  type CreateDailyLogInput,
  type DailyLog,
} from '@/lib/daily-logs';

const QUERY_KEY = ['daily-logs'] as const;

// Without realtime nothing invalidates this list, so refetch on focus and every minute while visible.
const LIST_REFRESH = getFallbackListQueryOptions(APP_CONFIG.enableRealtime, APP_CONFIG.listPollInterval);

interface UseDailyLogsOptions {
  enabled?: boolean;
}

export function useDailyLogs(department?: string, status?: string, logType?: string, options: UseDailyLogsOptions = {}) {
  return useQuery({
    ...LIST_REFRESH,
    queryKey: [...QUERY_KEY, department, status, logType],
    queryFn: () => fetchDailyLogs(department, status, logType),
    enabled: options.enabled ?? true,
  });
}

export function useMyDailyLogs(options: UseDailyLogsOptions = {}) {
  return useQuery({
    ...LIST_REFRESH,
    queryKey: [...QUERY_KEY, 'mine'],
    queryFn: fetchMyDailyLogs,
    enabled: options.enabled ?? true,
  });
}

export function useDailyLogsPaginated(page: number, limit: number, department?: string, status?: string, logType?: string, options: UseDailyLogsOptions = {}) {
  return useQuery({
    ...LIST_REFRESH,
    queryKey: [...QUERY_KEY, 'paginated', page, limit, department, status, logType],
    queryFn: () => fetchDailyLogsPaginated(page, limit, department, status, logType),
    enabled: options.enabled ?? true,
    placeholderData: (prev) => prev,
  });
}

export function useCreateDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: CreateDailyLogInput) => createDailyLog(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<DailyLog, 'id'>> }) =>
      updateDailyLog(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDailyLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useToggleLogLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => toggleLogLike(logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
