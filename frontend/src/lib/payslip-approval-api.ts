/**
 * Disbursement sign-off API calls (docs/api.md, "Payslip approval"). apiFetch
 * throws the server's message on any non-2xx answer, so callers show it inline.
 */

import { apiFetch } from "@/lib/api";
import type { ApiPayslip } from "@/lib/types/api";

export interface ApproveAllResult {
  periodId: string;
  approved: number;
  alreadyApproved: number;
  skippedOwn: number;
  /** Payslips the signer edited by hand, left for another signer (review fix 2026-10-28). */
  skippedEdited: number;
  total: number;
}

export interface PeriodApprovalSummary {
  periodId: string;
  periodStatus: string;
  total: number;
  approved: number;
  unapproved: number;
  /** What approve all would sign for you: not your own payslip, not one you edited. */
  toApprove: { count: number; gross: number; net: number };
  ownPending: boolean;
  /** Unapproved payslips you edited by hand; another signer approves them. */
  editedPending: number;
}

export interface ApprovalBody {
  signerName: string;
  signature: string;
  /** Single payslip: the amounts shown in the dialog. */
  expectedGrossPay?: number;
  expectedNetPay?: number;
  /** Approve all: the count and net total shown in the dialog. */
  expectedCount?: number;
  expectedNet?: number;
}

function post(body?: unknown): RequestInit {
  return { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
}

export async function approvePayslip(payslipId: string, body: ApprovalBody): Promise<ApiPayslip> {
  const res = await apiFetch(`/payroll/payslips/${encodeURIComponent(payslipId)}/approve`, post(body));
  return res.json();
}

export async function revokePayslipApproval(payslipId: string): Promise<ApiPayslip> {
  const res = await apiFetch(`/payroll/payslips/${encodeURIComponent(payslipId)}/revoke-approval`, post());
  return res.json();
}

export async function approveAllPayslips(periodId: string, body: ApprovalBody): Promise<ApproveAllResult> {
  const res = await apiFetch(`/payroll/periods/${encodeURIComponent(periodId)}/approve-all`, post(body));
  return res.json();
}

export async function fetchApprovalSummary(periodId: string): Promise<PeriodApprovalSummary> {
  const res = await apiFetch(`/payroll/periods/${encodeURIComponent(periodId)}/approval-summary`);
  return res.json();
}

/** Lock & Finalize. Without force the server answers 409 while payslips wait for sign-off. */
export async function lockPayrollPeriod(periodId: string, force: boolean): Promise<void> {
  await apiFetch(`/payroll/periods/${encodeURIComponent(periodId)}/lock`, post(force ? { force: true } : {}));
}
