"use client";

/**
 * React Query hooks for the managed payroll lists and payroll profiles.
 * Keys start with "payroll-options" / "payroll-profile", the same names the
 * backend broadcasts after a change, so open pages refetch without a reload.
 */

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_CONFIG } from "@/lib/config";
import { getFallbackListQueryOptions } from "@/lib/realtime-fallback";
import {
  PAYROLL_OPTIONS_QUERY_KEY,
  PAYROLL_PROFILE_QUERY_KEY,
  fetchPayrollOptionList,
  fetchPayrollProfile,
  fetchPayrollSchemes,
  payrollOptionListQueryKey,
  payrollProfileQueryKey,
  payrollSchemesQueryKey,
} from "@/lib/payroll-options-api";
import {
  getDefaultOption,
  getDefaultScheme,
  type PayrollOptionCategory,
  type PayrollOptionRow,
  type PayrollSchemeRow,
} from "@/lib/payroll-options";
import type { PayrollSetupDefaults } from "@/lib/payroll-setup";

const LIST_STALE_MS = 5 * 60 * 1000;
// Without a socket (production on Vercel) nothing pushes "payroll-options" or
// "payroll-profile": refetch on focus and every few minutes, like the other lists.
const LIST_REFRESH = getFallbackListQueryOptions(APP_CONFIG.enableRealtime, LIST_STALE_MS);

export function usePayrollSchemes(enabled = true) {
  return useQuery({
    queryKey: payrollSchemesQueryKey(),
    queryFn: fetchPayrollSchemes,
    staleTime: LIST_STALE_MS,
    enabled,
    ...LIST_REFRESH,
  });
}

export function usePayrollOptionList(category: PayrollOptionCategory, enabled = true) {
  return useQuery({
    queryKey: payrollOptionListQueryKey(category),
    queryFn: () => fetchPayrollOptionList(category),
    staleTime: LIST_STALE_MS,
    enabled,
    ...LIST_REFRESH,
  });
}

export interface PayrollCatalog {
  schemes?: PayrollSchemeRow[];
  employmentTypes?: PayrollOptionRow[];
  paymentFrequencies?: PayrollOptionRow[];
  /** True once all three lists have loaded. */
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  defaults: PayrollSetupDefaults;
  retry: () => void;
}

/** All three lists, their defaults, and one loading / error state. */
export function usePayrollCatalog(enabled = true): PayrollCatalog {
  const schemes = usePayrollSchemes(enabled);
  const employmentTypes = usePayrollOptionList("employment_type", enabled);
  const paymentFrequencies = usePayrollOptionList("payment_frequency", enabled);
  const failure = schemes.error ?? employmentTypes.error ?? paymentFrequencies.error;
  const defaults = useMemo<PayrollSetupDefaults>(() => ({
    payrollScheme: getDefaultScheme(schemes.data)?.key ?? "",
    employmentType: getDefaultOption(employmentTypes.data)?.value ?? "",
    paymentFrequency: getDefaultOption(paymentFrequencies.data)?.value ?? "",
  }), [schemes.data, employmentTypes.data, paymentFrequencies.data]);
  const { refetch: refetchSchemes } = schemes;
  const { refetch: refetchTypes } = employmentTypes;
  const { refetch: refetchFrequencies } = paymentFrequencies;
  const retry = useCallback(() => {
    void refetchSchemes();
    void refetchTypes();
    void refetchFrequencies();
  }, [refetchSchemes, refetchTypes, refetchFrequencies]);

  return {
    schemes: schemes.data,
    employmentTypes: employmentTypes.data,
    paymentFrequencies: paymentFrequencies.data,
    isReady: Boolean(schemes.data && employmentTypes.data && paymentFrequencies.data),
    isLoading: schemes.isLoading || employmentTypes.isLoading || paymentFrequencies.isLoading,
    error: failure ? (failure instanceof Error ? failure.message : "Could not load the payroll lists.") : null,
    defaults,
    retry,
  };
}

/** GET /payroll/config/:userId; refetched when a save or another tab changes it. */
export function usePayrollProfile(userId?: string | null) {
  return useQuery({
    queryKey: payrollProfileQueryKey(userId ?? ""),
    queryFn: () => fetchPayrollProfile(userId as string),
    enabled: Boolean(userId),
    refetchOnWindowFocus: LIST_REFRESH.refetchOnWindowFocus,
  });
}

/** Refetch the lists (and the profiles that show their names) after a change. */
export function useRefreshPayrollLists() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PAYROLL_OPTIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PAYROLL_PROFILE_QUERY_KEY }),
    ]);
  }, [queryClient]);
}
