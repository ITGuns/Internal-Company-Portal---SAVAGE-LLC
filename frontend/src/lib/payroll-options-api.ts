/**
 * API calls for the managed payroll lists and payroll profiles
 * (docs/api.md, "Payroll schemes and option lists"). apiFetch throws the
 * server's message on any non-2xx answer, so callers can show it inline.
 */

import { apiFetch } from "@/lib/api";
import type { PayrollOptionCategory, PayrollOptionRow, PayrollSchemeRow } from "@/lib/payroll-options";
import type { PayrollProfile } from "@/lib/payroll-setup";

/** Every React Query key for the lists starts with this; the socket resource has the same name. */
export const PAYROLL_OPTIONS_QUERY_KEY = ["payroll-options"] as const;
export const PAYROLL_PROFILE_QUERY_KEY = ["payroll-profile"] as const;

export const payrollSchemesQueryKey = () => [...PAYROLL_OPTIONS_QUERY_KEY, "schemes"] as const;
export const payrollOptionListQueryKey = (category: PayrollOptionCategory) => [...PAYROLL_OPTIONS_QUERY_KEY, category] as const;
export const payrollProfileQueryKey = (userId: string) => [...PAYROLL_PROFILE_QUERY_KEY, userId] as const;

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function send(method: "POST" | "PATCH", body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export async function fetchPayrollSchemes(): Promise<PayrollSchemeRow[]> {
  return json(await apiFetch("/payroll/schemes"));
}

export async function fetchPayrollOptionList(category: PayrollOptionCategory): Promise<PayrollOptionRow[]> {
  return json(await apiFetch(`/payroll/options/${category}`));
}

export async function createPayrollScheme(body: Record<string, unknown>): Promise<PayrollSchemeRow> {
  return json(await apiFetch("/payroll/schemes", send("POST", body)));
}

export async function updatePayrollScheme(id: string, body: Record<string, unknown>): Promise<PayrollSchemeRow> {
  return json(await apiFetch(`/payroll/schemes/${encodeURIComponent(id)}`, send("PATCH", body)));
}

export async function deletePayrollScheme(id: string): Promise<void> {
  await apiFetch(`/payroll/schemes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createPayrollOption(category: PayrollOptionCategory, body: Record<string, unknown>): Promise<PayrollOptionRow> {
  return json(await apiFetch(`/payroll/options/${category}`, send("POST", body)));
}

export async function updatePayrollOption(category: PayrollOptionCategory, id: string, body: Record<string, unknown>): Promise<PayrollOptionRow> {
  return json(await apiFetch(`/payroll/options/${category}/${encodeURIComponent(id)}`, send("PATCH", body)));
}

export async function deletePayrollOption(category: PayrollOptionCategory, id: string): Promise<void> {
  await apiFetch(`/payroll/options/${category}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchPayrollProfile(userId: string): Promise<PayrollProfile> {
  return json(await apiFetch(`/payroll/config/${encodeURIComponent(userId)}`));
}

export async function savePayrollProfile(userId: string, body: Record<string, unknown>): Promise<PayrollProfile> {
  return json(await apiFetch(`/payroll/config/${encodeURIComponent(userId)}`, send("POST", body)));
}
