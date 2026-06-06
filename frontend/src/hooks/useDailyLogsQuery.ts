/**
 * React Query hooks for daily logs.
 * Uses 'daily-logs' query key — automatically invalidated when
 * the backend emits a data:changed event for this resource.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDailyLogs,
  fetchDailyLogsPaginated,
  createDailyLog,
  updateDailyLog,
  deleteDailyLog,
  toggleLogLike,
  type DailyLog,
  type LogTask,
  type LogStatus,
} from '@/lib/daily-logs';

const QUERY_KEY = ['daily-logs'] as const;

export function useDailyLogs(department?: string, status?: string, logType?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, department, status, logType],
    queryFn: () => fetchDailyLogs(department, status, logType),
  });
}

export function useDailyLogsPaginated(page: number, limit: number, department?: string, status?: string, logType?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'paginated', page, limit, department, status, logType],
    queryFn: () => fetchDailyLogsPaginated(page, limit, department, status, logType),
    placeholderData: (prev) => prev,
  });
}

export function useCreateDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      department: string;
      date: string;
      hoursLogged: number;
      tasks: LogTask[];
      status?: LogStatus;
      shiftNotes?: string;
      logType?: string;
    }) =>
      createDailyLog(
        args.department,
        args.date,
        args.hoursLogged,
        args.tasks,
        args.status,
        args.shiftNotes,
        args.logType,
      ),
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
