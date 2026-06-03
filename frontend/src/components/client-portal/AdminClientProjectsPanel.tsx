"use client";

import { useEffect, useState } from "react";
import { Activity, Save } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import {
  ClientProject,
  createClientProject,
  updateClientProject,
} from "@/lib/client-portal";
import {
  CLIENT_PROJECT_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import ClientOperationsPanel, {
  clientOperationsSelectClass,
  clientOperationsTextareaClass,
} from "./ClientOperationsPanel";

const emptyProject = { name: "", status: "planning", progress: "0", summary: "", liveUrl: "", previewUrl: "", internalNotes: "" };

interface AdminClientProjectsPanelProps {
  organizationId: string;
  projects: ClientProject[];
  saving: boolean;
  submitScoped: (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => Promise<void>;
  refreshClient: (organizationId?: string) => Promise<void>;
  setSaving: (saving: boolean) => void;
}

export default function AdminClientProjectsPanel({
  organizationId,
  projects,
  saving,
  submitScoped,
  refreshClient,
  setSaving,
}: AdminClientProjectsPanelProps) {
  const toast = useToast();
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [projectEdits, setProjectEdits] = useState<Record<string, { status: string; progress: string }>>({});

  useEffect(() => {
    setProjectEdits(Object.fromEntries(
      projects.map((project) => [
        project.id,
        {
          status: project.status,
          progress: String(project.progress || 0),
        },
      ]),
    ));
  }, [projects]);

  function getProjectEdit(project: ClientProject) {
    return projectEdits[project.id] || {
      status: project.status,
      progress: String(project.progress || 0),
    };
  }

  async function updateProject(project: ClientProject) {
    const edit = getProjectEdit(project);
    setSaving(true);
    try {
      await updateClientProject(project.id, {
        status: edit.status,
        progress: Number(edit.progress),
      });
      await refreshClient(organizationId);
      toast.success("Project progress updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClientOperationsPanel icon={Activity} title="Projects" count={projects.length}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitScoped(
            () => createClientProject(organizationId, { ...projectForm, progress: Number(projectForm.progress) }),
            "Client project created",
            () => setProjectForm(emptyProject),
          );
        }}
        className="space-y-3"
      >
        <FormField id="project-name" name="project-name" label="Project Name" value={projectForm.name} onChange={(name) => setProjectForm((form) => ({ ...form, name }))} autoComplete="off" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="project-status" className="mb-2 block text-sm font-medium">Status</label>
            <select id="project-status" name="project-status" className={clientOperationsSelectClass} value={projectForm.status} onChange={(event) => setProjectForm((form) => ({ ...form, status: event.target.value }))}>
              {CLIENT_PROJECT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
              <label htmlFor="project-progress">Progress</label>
              <span className="text-[var(--muted)]">{projectForm.progress}%</span>
            </div>
            <input
              id="project-progress"
              name="project-progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={projectForm.progress}
              onChange={(event) => setProjectForm((form) => ({ ...form, progress: event.target.value }))}
              className="h-10 w-full accent-[var(--accent)]"
            />
          </div>
        </div>
        <textarea className={clientOperationsTextareaClass} name="project-summary" autoComplete="off" value={projectForm.summary} onChange={(event) => setProjectForm((form) => ({ ...form, summary: event.target.value }))} placeholder="Add a client-visible summary…" aria-label="Project summary" />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="project-live" name="project-live" label="Live URL" type="url" inputMode="url" autoComplete="off" value={projectForm.liveUrl} onChange={(liveUrl) => setProjectForm((form) => ({ ...form, liveUrl }))} />
          <FormField id="project-preview" name="project-preview" label="Preview URL" type="url" inputMode="url" autoComplete="off" value={projectForm.previewUrl} onChange={(previewUrl) => setProjectForm((form) => ({ ...form, previewUrl }))} />
        </div>
        <Button type="submit" loading={saving}>Create Project</Button>
      </form>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <div className="mb-3 text-sm font-semibold">Progress Control</div>
        {projects.length === 0 ? (
          <EmptyState variant="compact" icon={Activity} title="No projects yet" description="Create a project before updating progress." />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const edit = getProjectEdit(project);
              const hasChanges = edit.status !== project.status || Number(edit.progress) !== (project.progress || 0);

              return (
                <div key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-medium leading-6">{project.name}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{project.progress || 0}% current progress</div>
                    </div>
                    <StatusBadge label={getClientPortalOptionLabel(CLIENT_PROJECT_STATUSES, project.status)} size="sm" />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <label htmlFor={`project-status-${project.id}`} className="mb-2 block text-sm font-medium">Status</label>
                      <select
                        id={`project-status-${project.id}`}
                        name={`project-status-${project.id}`}
                        className={clientOperationsSelectClass}
                        value={edit.status}
                        onChange={(event) => setProjectEdits((current) => ({
                          ...current,
                          [project.id]: { ...getProjectEdit(project), status: event.target.value },
                        }))}
                      >
                        {CLIENT_PROJECT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
                        <label htmlFor={`project-progress-${project.id}`}>Progress</label>
                        <span className="text-[var(--muted)]">{edit.progress}%</span>
                      </div>
                      <input
                        id={`project-progress-${project.id}`}
                        name={`project-progress-${project.id}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={edit.progress}
                        onChange={(event) => setProjectEdits((current) => ({
                          ...current,
                          [project.id]: { ...getProjectEdit(project), progress: event.target.value },
                        }))}
                        className="h-10 w-full accent-[var(--accent)]"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      icon={<Save className="h-4 w-4" />}
                      loading={saving && hasChanges}
                      disabled={!hasChanges || saving}
                      onClick={() => void updateProject(project)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClientOperationsPanel>
  );
}
