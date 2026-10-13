"use client";

/** "My requests" on the payroll calendar: every overtime and correction request the person filed. */

import React from "react";
import type { OvertimeRequest } from "@/lib/overtime-requests";
import type { AdjustmentRequest } from "@/lib/adjustment-requests";
import { CorrectionRequestItem, OvertimeRequestItem } from "./TimeRequestItems";

interface MyTimeRequestsProps {
  overtime: OvertimeRequest[];
  corrections: AdjustmentRequest[];
  loading: boolean;
  error: string | null;
}

function RequestColumn({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">{title} ({count})</h3>
      <ul className="space-y-2">
        {children}
        {count === 0 && <li className="text-sm text-[var(--muted)]">None.</li>}
      </ul>
    </div>
  );
}

export default function MyTimeRequests({ overtime, corrections, loading, error }: MyTimeRequestsProps) {
  const isEmpty = overtime.length === 0 && corrections.length === 0;
  return (
    <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card-surface)] p-4" aria-labelledby="my-requests-heading">
      <h2 id="my-requests-heading" className="text-sm font-semibold">My requests</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Overtime is paid only after it is approved. Approved corrections change the time entry.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading && isEmpty && <p className="mt-3 text-sm text-[var(--muted)]">Loading your requests.</p>}
      {!loading && !error && isEmpty && (
        <p className="mt-3 rounded border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
          You have not filed any overtime or correction requests.
        </p>
      )}
      {!isEmpty && (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <RequestColumn title="Overtime" count={overtime.length}>
            {overtime.map((request) => <OvertimeRequestItem key={request.id} request={request} />)}
          </RequestColumn>
          <RequestColumn title="Corrections" count={corrections.length}>
            {corrections.map((request) => <CorrectionRequestItem key={request.id} request={request} />)}
          </RequestColumn>
        </div>
      )}
    </section>
  );
}
