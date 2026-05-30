"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import {
  ClientMetricSnapshot,
  createClientMetric,
} from "@/lib/client-portal";
import ClientOperationsPanel, {
  clientOperationsCheckboxClass,
  clientOperationsCheckboxLabelClass,
} from "./ClientOperationsPanel";

const emptyMetric = { label: "", value: "", unit: "", source: "manual", visibleToClient: true };

interface AdminClientMetricsPanelProps {
  organizationId: string;
  metrics: ClientMetricSnapshot[];
  saving: boolean;
  submitScoped: (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => Promise<void>;
}

export default function AdminClientMetricsPanel({
  organizationId,
  metrics,
  saving,
  submitScoped,
}: AdminClientMetricsPanelProps) {
  const [metricForm, setMetricForm] = useState(emptyMetric);

  return (
    <ClientOperationsPanel icon={BarChart3} title="Metric Snapshot" count={metrics.length}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitScoped(
            () => createClientMetric(organizationId, metricForm),
            "Client metric added",
            () => setMetricForm(emptyMetric),
          );
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField id="metric-label" label="Label" value={metricForm.label} onChange={(label) => setMetricForm((form) => ({ ...form, label }))} required />
          <FormField id="metric-value" label="Value" value={metricForm.value} onChange={(value) => setMetricForm((form) => ({ ...form, value }))} required />
          <FormField id="metric-unit" label="Unit" value={metricForm.unit} onChange={(unit) => setMetricForm((form) => ({ ...form, unit }))} />
        </div>
        <label className={clientOperationsCheckboxLabelClass}>
          <input className={clientOperationsCheckboxClass} type="checkbox" checked={metricForm.visibleToClient} onChange={(event) => setMetricForm((form) => ({ ...form, visibleToClient: event.target.checked }))} />
          Visible to client
        </label>
        <Button type="submit" loading={saving}>Add Metric</Button>
      </form>
    </ClientOperationsPanel>
  );
}
