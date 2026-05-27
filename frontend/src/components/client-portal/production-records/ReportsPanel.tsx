"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type { ClientReport } from "@/lib/client-portal";
import {
  createClientReport,
  updateClientReport,
} from "@/lib/client-portal";
import {
  buildReportUpdatePayload,
  toDateInputValue,
  type ReportEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_REPORT_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  EditFormActions,
  InlineRecordControls,
  MiniPanel,
  RecordHeader,
  selectClass,
  TextareaField,
  VisibilityCheckbox,
} from "./shared";

const emptyReport = { title: "", summary: "", periodStart: "", periodEnd: "", leadsCaptured: "", missedOpportunities: "", followUpStatus: "", visibleToClient: true };

function toReportForm(report: ClientReport): ReportEditForm {
  return {
    title: report.title || "",
    summary: report.summary || "",
    status: report.status || "draft",
    periodStart: toDateInputValue(report.periodStart),
    periodEnd: toDateInputValue(report.periodEnd),
    leadsCaptured: report.leadsCaptured ?? "",
    missedOpportunities: report.missedOpportunities ?? "",
    followUpStatus: report.followUpStatus || "",
    visibleToClient: report.visibleToClient !== false,
  };
}

function ReportRecord({
  report,
  saving,
  submitScoped,
}: {
  report: ClientReport;
  saving: boolean;
  submitScoped: ProductionRecordPanelProps["submitScoped"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ReportEditForm>(() => toReportForm(report));

  useEffect(() => {
    if (!isEditing) setForm(toReportForm(report));
  }, [isEditing, report]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
      <RecordHeader
        title={report.title}
        subtitle={getClientPortalOptionLabel(CLIENT_REPORT_STATUSES, report.status)}
        isEditing={isEditing}
        saving={saving}
        onToggleEdit={() => setIsEditing((current) => !current)}
      />

      <InlineRecordControls
        status={report.status}
        statusOptions={CLIENT_REPORT_STATUSES}
        visibleToClient={report.visibleToClient !== false}
        saving={saving}
        archiveDisabled={report.status === "archived"}
        onSave={(data) => submitScoped(() => updateClientReport(report.id, data), "Report updated", () => undefined)}
        onArchive={() => submitScoped(() => updateClientReport(report.id, { status: "archived" }), "Report archived", () => undefined)}
      />

      {isEditing ? (
        <form
          className="mt-3 space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitScoped(
              () => updateClientReport(report.id, buildReportUpdatePayload(form)),
              "Report details saved",
              () => setIsEditing(false),
            );
          }}
        >
          <FormField id={`report-title-${report.id}`} label="Title" value={form.title} onChange={(title) => setForm((current) => ({ ...current, title }))} required />
          <TextareaField value={form.summary || ""} onChange={(summary) => setForm((current) => ({ ...current, summary }))} placeholder="Client-facing report summary" ariaLabel={`Report summary for ${report.title}`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={selectClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} aria-label="Report status">
              {CLIENT_REPORT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <FormField id={`report-leads-${report.id}`} label="Leads" type="number" value={form.leadsCaptured ?? ""} onChange={(leadsCaptured) => setForm((current) => ({ ...current, leadsCaptured }))} />
            <FormField id={`report-start-${report.id}`} label="Period Start" type="date" value={form.periodStart || ""} onChange={(periodStart) => setForm((current) => ({ ...current, periodStart }))} />
            <FormField id={`report-end-${report.id}`} label="Period End" type="date" value={form.periodEnd || ""} onChange={(periodEnd) => setForm((current) => ({ ...current, periodEnd }))} />
            <FormField id={`report-missed-${report.id}`} label="Missed Opportunities" type="number" value={form.missedOpportunities ?? ""} onChange={(missedOpportunities) => setForm((current) => ({ ...current, missedOpportunities }))} />
            <FormField id={`report-follow-up-${report.id}`} label="Follow-up Status" value={form.followUpStatus || ""} onChange={(followUpStatus) => setForm((current) => ({ ...current, followUpStatus }))} />
          </div>
          <VisibilityCheckbox checked={form.visibleToClient} onChange={(visibleToClient) => setForm((current) => ({ ...current, visibleToClient }))} />
          <EditFormActions saving={saving} onCancel={() => setIsEditing(false)} />
        </form>
      ) : null}
    </div>
  );
}

export default function ReportsPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  recordLimit,
}: ProductionRecordPanelProps) {
  const [reportForm, setReportForm] = useState(emptyReport);
  const reports = typeof recordLimit === "number" ? (overview.reports || []).slice(0, recordLimit) : (overview.reports || []);

  return (
    <MiniPanel title="Monthly Report" icon={FileText} count={overview.reports?.length || 0}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitScoped(
            () => createClientReport(organizationId, {
              title: reportForm.title,
              summary: reportForm.summary || undefined,
              periodStart: reportForm.periodStart,
              periodEnd: reportForm.periodEnd,
              status: "published",
              leadsCaptured: reportForm.leadsCaptured ? Number(reportForm.leadsCaptured) : undefined,
              missedOpportunities: reportForm.missedOpportunities ? Number(reportForm.missedOpportunities) : undefined,
              followUpStatus: reportForm.followUpStatus || undefined,
              visibleToClient: reportForm.visibleToClient,
            }),
            "Client report published",
            () => setReportForm(emptyReport),
          );
        }}
        className="space-y-3"
      >
        <FormField id="report-title" label="Title" value={reportForm.title} onChange={(title) => setReportForm((form) => ({ ...form, title }))} required />
        <TextareaField value={reportForm.summary} onChange={(summary) => setReportForm((form) => ({ ...form, summary }))} placeholder="Client-facing report summary" ariaLabel="Report summary" />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="report-start" label="Period Start" type="date" value={reportForm.periodStart} onChange={(periodStart) => setReportForm((form) => ({ ...form, periodStart }))} required />
          <FormField id="report-end" label="Period End" type="date" value={reportForm.periodEnd} onChange={(periodEnd) => setReportForm((form) => ({ ...form, periodEnd }))} required />
          <FormField id="report-leads" label="Leads" type="number" value={reportForm.leadsCaptured} onChange={(leadsCaptured) => setReportForm((form) => ({ ...form, leadsCaptured }))} />
          <FormField id="report-missed" label="Missed Opportunities" type="number" value={reportForm.missedOpportunities} onChange={(missedOpportunities) => setReportForm((form) => ({ ...form, missedOpportunities }))} />
        </div>
        <FormField id="report-follow-up" label="Follow-up Status" value={reportForm.followUpStatus} onChange={(followUpStatus) => setReportForm((form) => ({ ...form, followUpStatus }))} />
        <VisibilityCheckbox checked={reportForm.visibleToClient} onChange={(visibleToClient) => setReportForm((form) => ({ ...form, visibleToClient }))} />
        <Button type="submit" loading={saving}>Publish Report</Button>
      </form>

      <div className="mt-4 space-y-2">
        {reports.map((report) => (
          <ReportRecord key={report.id} report={report} saving={saving} submitScoped={submitScoped} />
        ))}
      </div>
    </MiniPanel>
  );
}
