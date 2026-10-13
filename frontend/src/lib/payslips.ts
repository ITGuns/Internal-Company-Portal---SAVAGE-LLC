/**
 * Payslip edit/delete API client (docs/payroll-time-v2-spec.md).
 * Both routes answer 409 when the payslip's period is processed (locked);
 * apiFetch throws with the server's message in that case.
 */

import { apiFetch } from "./api";
import type { PayslipItemPayload } from "./payslip-edit";
import type { ApiPayslip } from "./types/api";

export async function fetchUserPayslips(userId?: string): Promise<ApiPayslip[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const res = await apiFetch(`/payroll/my-payslips${query}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function updatePayslip(
  id: string,
  input: { items: PayslipItemPayload[]; note: string },
): Promise<ApiPayslip> {
  const res = await apiFetch(`/payroll/payslips/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ items: input.items, note: input.note.trim() }),
  });
  return res.json();
}

export async function deletePayslip(id: string): Promise<void> {
  await apiFetch(`/payroll/payslips/${encodeURIComponent(id)}`, { method: "DELETE" });
}
