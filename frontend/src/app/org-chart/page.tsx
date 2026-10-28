"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import OrgChartView from '@/components/org-chart/OrgChartView';
import { useUser } from '@/contexts/UserContext';
import { ORG_CHART_QUERY_KEY, fetchOrgChart } from '@/lib/org-chart';

function OrgChartSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-16 w-full" />
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
        <Skeleton className="h-4 w-40" />
        <div className="mt-6 flex flex-col items-center gap-6">
          <Skeleton className="h-28 w-full sm:w-60" />
          <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
            <Skeleton className="h-28 w-full sm:w-60" />
            <Skeleton className="h-28 w-full sm:w-60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrgChartPage() {
  const { user } = useUser();
  const orgChart = useQuery({ queryKey: ORG_CHART_QUERY_KEY, queryFn: fetchOrgChart, enabled: Boolean(user) });

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <div className="p-4 pt-3 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {orgChart.isPending ? (
            <OrgChartSkeleton />
          ) : orgChart.isError ? (
            <div role="alert" className="mx-auto max-w-xl rounded-[var(--radius-md)] border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-blocked)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Could not load the org chart</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{orgChart.error.message}</p>
                  <Button className="mt-3" size="sm" variant="secondary" onClick={() => void orgChart.refetch()}>
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <OrgChartView data={orgChart.data} />
          )}
        </div>
      </div>
    </main>
  );
}
