"use client";

import type { ClientPortalOverview } from "@/lib/client-portal";
import ApprovalsPanel from "./production-records/ApprovalsPanel";
import AssetsPanel from "./production-records/AssetsPanel";
import BillingPanel from "./production-records/BillingPanel";
import CalendarPanel from "./production-records/CalendarPanel";
import ReportsPanel from "./production-records/ReportsPanel";
import RoadmapPanel from "./production-records/RoadmapPanel";
import WorkItemsPanel from "./production-records/WorkItemsPanel";
import type { SubmitScoped } from "./production-records/types";

interface AdminClientProductionRecordsProps {
  organizationId: string;
  overview: ClientPortalOverview;
  saving: boolean;
  submitScoped: SubmitScoped;
}

export default function AdminClientProductionRecords({
  organizationId,
  overview,
  saving,
  submitScoped,
}: AdminClientProductionRecordsProps) {
  const panelProps = {
    organizationId,
    overview,
    saving,
    submitScoped,
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <WorkItemsPanel {...panelProps} />
      <ApprovalsPanel {...panelProps} />
      <ReportsPanel {...panelProps} />
      <RoadmapPanel {...panelProps} />
      <AssetsPanel {...panelProps} />
      <BillingPanel {...panelProps} />
      <CalendarPanel {...panelProps} />
    </div>
  );
}
