"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  FileText,
  LinkIcon,
  Plus,
  Save,
  ShieldCheck,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import Button from "@/components/Button";
import AdminTicketPanel from "@/components/client-portal/AdminTicketPanel";
import FormField from "@/components/forms/FormField";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import {
  ClientMembership,
  ClientOrganization,
  ClientPortalOverview,
  ClientProject,
  ClientTicket,
  createClientMembership,
  createClientMetric,
  createClientOrganization,
  createClientProject,
  createClientResource,
  createClientTicketComment,
  createClientUpdate,
  fetchClientMemberships,
  fetchClientOrganizations,
  fetchClientOverview,
  updateClientProject,
  updateClientTicketStatus,
} from "@/lib/client-portal";
import {
  CLIENT_MEMBER_ROLES,
  CLIENT_MEMBER_STATUSES,
  CLIENT_PROJECT_STATUSES,
  CLIENT_TICKET_CATEGORIES,
  CLIENT_TICKET_PRIORITIES,
  CLIENT_TICKET_STATUSES,
  CLIENT_UPDATE_PRESETS,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { buildClientPortalSummary } from "@/lib/client-portal-summary";
import { hasClientOperationsAccess } from "@/lib/role-access";
import { fetchUsers, User } from "@/lib/users";

const selectClass = "w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

const emptyOrg = { name: "", slug: "", websiteUrl: "", notes: "" };
const emptyMember = { userId: "", role: "client_owner", status: "active" };
const emptyProject = { name: "", status: "planning", progress: "0", summary: "", liveUrl: "", previewUrl: "", internalNotes: "" };
const emptyUpdate = { title: "", body: "", status: "published", visibleToClient: true, projectId: "" };
const emptyMetric = { label: "", value: "", unit: "", source: "manual", visibleToClient: true };
const emptyResource = { label: "", url: "", type: "link", visibleToClient: true, projectId: "" };

function SectionHeader({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>; title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {typeof count === "number" ? <span className="text-xs text-[var(--muted)]">{count}</span> : null}
    </div>
  );
}

function Section({ children, icon, title, count }: { children: React.ReactNode; icon: React.ComponentType<{ className?: string }>; title: string; count?: number }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
      <SectionHeader icon={icon} title={title} count={count} />
      <div className="p-4">{children}</div>
    </section>
  );
}

function ProjectPillSelector({
  projects,
  value,
  onChange,
}: {
  projects: ClientProject[];
  value: string;
  onChange: (projectId: string) => void;
}) {
  if (projects.length === 0) return null;

  const options = [{ id: "", name: "General" }, ...projects.map((project) => ({ id: project.id, name: project.name }))];

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Project</div>
      <div className="flex flex-wrap gap-2">
        {options.map((project) => {
          const isSelected = value === project.id;

          return (
            <button
              key={project.id || "general"}
              type="button"
              onClick={() => onChange(project.id)}
              aria-pressed={isSelected}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isSelected ? "border-[var(--accent)] bg-[var(--card-surface)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
            >
              {project.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OperationsClientsPage() {
  const toast = useToast();
  const { user, isLoading: userLoading } = useUser();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [overview, setOverview] = useState<ClientPortalOverview | null>(null);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgForm, setOrgForm] = useState(emptyOrg);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [projectEdits, setProjectEdits] = useState<Record<string, { status: string; progress: string }>>({});
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const [metricForm, setMetricForm] = useState(emptyMetric);
  const [resourceForm, setResourceForm] = useState(emptyResource);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [ticketReplyForm, setTicketReplyForm] = useState({ body: "", visibility: "client" });

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId) || overview?.organization || null,
    [organizations, overview, selectedId],
  );
  const summary = useMemo(() => buildClientPortalSummary(overview), [overview]);
  const canManageClients = useMemo(() => hasClientOperationsAccess(user), [user]);
  const selectedTicket = useMemo(
    () => overview?.tickets.find((ticket) => ticket.id === selectedTicketId) || overview?.tickets[0] || null,
    [overview, selectedTicketId],
  );

  const loadOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    setOrganizations(nextOrganizations);
    setSelectedId((current) => current || nextOrganizations[0]?.id || "");
  }, []);

  const loadSelected = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setOverview(null);
      setMemberships([]);
      setProjectEdits({});
      return;
    }
    const [nextOverview, nextMemberships] = await Promise.all([
      fetchClientOverview(organizationId),
      fetchClientMemberships(organizationId),
    ]);
    setOverview(nextOverview);
    setMemberships(nextMemberships);
  }, []);

  useEffect(() => {
    if (!overview) {
      setProjectEdits({});
      return;
    }

    setProjectEdits(Object.fromEntries(
      overview.projects.map((project) => [
        project.id,
        {
          status: project.status,
          progress: String(project.progress || 0),
        },
      ]),
    ));
  }, [overview]);

  useEffect(() => {
    setSelectedTicketId((current) => {
      const tickets = overview?.tickets || [];
      if (tickets.length === 0) return "";
      return tickets.some((ticket) => ticket.id === current) ? current : tickets[0].id;
    });
  }, [overview]);

  useEffect(() => {
    if (userLoading) return;
    if (!canManageClients) {
      setLoading(false);
      setOrganizations([]);
      setSelectedId("");
      setOverview(null);
      setMemberships([]);
      setUsers([]);
      return;
    }

    let isMounted = true;
    async function loadInitial() {
      try {
        setLoading(true);
        const [nextUsers] = await Promise.all([
          fetchUsers(),
          loadOrganizations(),
        ]);
        if (isMounted) setUsers(nextUsers);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load client operations");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      isMounted = false;
    };
  }, [canManageClients, loadOrganizations, toast, userLoading]);

  useEffect(() => {
    if (userLoading || !canManageClients) return;

    loadSelected(selectedId).catch((error) => {
      console.error(error);
      toast.error("Failed to load client details");
    });
  }, [canManageClients, loadSelected, selectedId, toast, userLoading]);

  async function refreshCurrent() {
    await loadOrganizations();
    if (selectedId) await loadSelected(selectedId);
  }

  async function handleCreateOrganization(event: React.FormEvent) {
    event.preventDefault();
    if (!orgForm.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    try {
      const organization = await createClientOrganization({
        name: orgForm.name,
        slug: orgForm.slug || undefined,
        websiteUrl: orgForm.websiteUrl || undefined,
        notes: orgForm.notes || undefined,
      });
      setOrgForm(emptyOrg);
      setSelectedId(organization.id);
      await refreshCurrent();
      toast.success("Client organization created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  async function submitScoped(action: () => Promise<unknown>, successMessage: string, reset: () => void) {
    if (!selectedId) return;
    setSaving(true);
    try {
      await action();
      reset();
      await loadSelected(selectedId);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : successMessage);
    } finally {
      setSaving(false);
    }
  }

  function getProjectEdit(project: ClientProject) {
    return projectEdits[project.id] || {
      status: project.status,
      progress: String(project.progress || 0),
    };
  }

  async function handleUpdateProject(project: ClientProject) {
    if (!selectedId) return;

    const edit = getProjectEdit(project);
    setSaving(true);
    try {
      await updateClientProject(project.id, {
        status: edit.status,
        progress: Number(edit.progress),
      });
      await loadSelected(selectedId);
      toast.success("Project progress updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTicketStatus(ticket: ClientTicket, status: string) {
    if (!selectedId || ticket.status === status) return;

    setSaving(true);
    try {
      await updateClientTicketStatus(ticket.id, status);
      await loadSelected(selectedId);
      toast.success("Ticket status updated and reflected in updates");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update ticket status");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTicketReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !selectedTicket || !ticketReplyForm.body.trim()) {
      toast.error("Reply is required");
      return;
    }

    setSaving(true);
    try {
      await createClientTicketComment(selectedTicket.id, {
        body: ticketReplyForm.body.trim(),
        visibility: ticketReplyForm.visibility,
      });
      setTicketReplyForm({ body: "", visibility: "client" });
      await loadSelected(selectedId);
      toast.success(ticketReplyForm.visibility === "internal" ? "Internal note saved" : "Client reply sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add ticket reply");
    } finally {
      setSaving(false);
    }
  }

  if (userLoading) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-0">
          <Header title="Client Operations" subtitle="Manage client accounts, portal access, work updates, metrics, and resources." />
          <div className="mt-6 text-sm text-[var(--muted)]">Checking client operations access...</div>
        </div>
      </main>
    );
  }

  if (!canManageClients) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-0">
          <Header title="Client Operations" subtitle="Manage client accounts, portal access, work updates, metrics, and resources." />
          <div className="mt-6">
            <EmptyState
              icon={ShieldCheck}
              title="Client operations access required"
              description="Client administration is available to admins and operations managers."
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Client Operations" subtitle="Manage client accounts, portal access, work updates, metrics, and resources." />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/operations" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Back to departments and roles
          </Link>
          <Link href="/client" className="text-sm font-medium text-[var(--accent)] hover:underline">
            Open client portal preview
          </Link>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-5">
            <Section icon={BriefcaseBusiness} title="Create Client">
              <form onSubmit={handleCreateOrganization} className="space-y-3">
                <FormField id="client-name" label="Client Name" value={orgForm.name} onChange={(name) => setOrgForm((form) => ({ ...form, name }))} placeholder="Gem Field HVAC" required />
                <FormField id="client-website" label="Website URL" value={orgForm.websiteUrl} onChange={(websiteUrl) => setOrgForm((form) => ({ ...form, websiteUrl }))} placeholder="https://example.com" />
                <textarea className={textareaClass} value={orgForm.notes} onChange={(event) => setOrgForm((form) => ({ ...form, notes: event.target.value }))} placeholder="Internal notes" aria-label="Internal client notes" />
                <Button type="submit" icon={<Plus className="h-4 w-4" />} loading={saving} fullWidth>Create Client</Button>
              </form>
            </Section>

            <Section icon={BriefcaseBusiness} title="Clients" count={organizations.length}>
              {loading ? (
                <div className="text-sm text-[var(--muted)]">Loading clients...</div>
              ) : organizations.length === 0 ? (
                <EmptyState variant="compact" icon={BriefcaseBusiness} title="No client accounts yet" description="Create a client organization to begin portal setup." />
              ) : (
                <div className="space-y-2">
                  {organizations.map((organization) => (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => setSelectedId(organization.id)}
                      className={`w-full rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors ${selectedId === organization.id ? "border-[var(--accent)] bg-[var(--card-surface)]" : "border-[var(--border)] hover:bg-[var(--surface-hover)]"}`}
                    >
                      <div className="truncate text-sm font-semibold">{organization.name}</div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                        <span className="truncate">{organization.slug}</span>
                        <span>{organization.counts?.tickets || 0} tickets</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Section>
          </aside>

          {selectedOrganization && overview ? (
            <div className="space-y-5">
              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase text-[var(--muted)]">{selectedOrganization.slug}</div>
                    <h1 className="mt-1 text-xl font-semibold">{selectedOrganization.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                      <StatusBadge label={selectedOrganization.status} size="sm" />
                      {selectedOrganization.websiteUrl ? <a className="hover:text-[var(--foreground)]" href={selectedOrganization.websiteUrl} target="_blank" rel="noreferrer">{selectedOrganization.websiteUrl}</a> : <span>No website URL</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                    {[
                      ["Projects", summary.projectCount],
                      ["Open tickets", summary.openTicketCount],
                      ["Updates", summary.updateCount],
                      ["Progress", `${summary.averageProgress}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3">
                        <div className="text-lg font-semibold">{value}</div>
                        <div className="text-xs text-[var(--muted)]">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <Section icon={UserPlus} title="Members" count={memberships.length}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitScoped(() => createClientMembership(selectedId, memberForm), "Client member saved", () => setMemberForm(emptyMember));
                    }}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <select className={`${selectClass} sm:col-span-3`} value={memberForm.userId} onChange={(event) => setMemberForm((form) => ({ ...form, userId: event.target.value }))} aria-label="Client member user" required>
                      <option value="">Select user</option>
                      {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
                    </select>
                    <select className={selectClass} value={memberForm.role} onChange={(event) => setMemberForm((form) => ({ ...form, role: event.target.value }))} aria-label="Client member role">
                      {CLIENT_MEMBER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    <select className={selectClass} value={memberForm.status} onChange={(event) => setMemberForm((form) => ({ ...form, status: event.target.value }))} aria-label="Client member status">
                      {CLIENT_MEMBER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                    <Button type="submit" size="sm" loading={saving}>Save</Button>
                  </form>
                  <div className="mt-4 space-y-2">
                    {memberships.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{membership.user?.name || membership.user?.email}</div>
                          <div className="truncate text-xs text-[var(--muted)]">{membership.user?.email}</div>
                        </div>
                        <div className="text-right text-xs text-[var(--muted)]">{membership.role}<br />{membership.status}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section icon={Activity} title="Projects" count={overview.projects.length}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitScoped(
                        () => createClientProject(selectedId, { ...projectForm, progress: Number(projectForm.progress) }),
                        "Client project created",
                        () => setProjectForm(emptyProject),
                      );
                    }}
                    className="space-y-3"
                  >
                    <FormField id="project-name" label="Project Name" value={projectForm.name} onChange={(name) => setProjectForm((form) => ({ ...form, name }))} required />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="project-status" className="mb-2 block text-sm font-medium">Status</label>
                        <select id="project-status" className={selectClass} value={projectForm.status} onChange={(event) => setProjectForm((form) => ({ ...form, status: event.target.value }))}>
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
                    <textarea className={textareaClass} value={projectForm.summary} onChange={(event) => setProjectForm((form) => ({ ...form, summary: event.target.value }))} placeholder="Client-visible summary" aria-label="Project summary" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="project-live" label="Live URL" value={projectForm.liveUrl} onChange={(liveUrl) => setProjectForm((form) => ({ ...form, liveUrl }))} />
                      <FormField id="project-preview" label="Preview URL" value={projectForm.previewUrl} onChange={(previewUrl) => setProjectForm((form) => ({ ...form, previewUrl }))} />
                    </div>
                    <Button type="submit" loading={saving}>Create Project</Button>
                  </form>

                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <div className="mb-3 text-sm font-semibold">Progress Control</div>
                    {overview.projects.length === 0 ? (
                      <EmptyState variant="compact" icon={Activity} title="No projects yet" description="Create a project before updating progress." />
                    ) : (
                      <div className="space-y-3">
                        {overview.projects.map((project) => {
                          const edit = getProjectEdit(project);
                          const hasChanges = edit.status !== project.status || Number(edit.progress) !== (project.progress || 0);

                          return (
                            <div key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{project.name}</div>
                                  <div className="mt-1 text-xs text-[var(--muted)]">{project.progress || 0}% current progress</div>
                                </div>
                                <StatusBadge label={getClientPortalOptionLabel(CLIENT_PROJECT_STATUSES, project.status)} size="sm" />
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                                <div>
                                  <label htmlFor={`project-status-${project.id}`} className="mb-2 block text-sm font-medium">Status</label>
                                  <select
                                    id={`project-status-${project.id}`}
                                    className={selectClass}
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
                                  onClick={() => void handleUpdateProject(project)}
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
                </Section>

                <Section icon={FileText} title="Update" count={overview.updates.length}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitScoped(() => createClientUpdate(selectedId, updateForm), "Client update published", () => setUpdateForm(emptyUpdate));
                    }}
                    className="space-y-3"
                  >
                    <FormField id="update-title" label="Title" value={updateForm.title} onChange={(title) => setUpdateForm((form) => ({ ...form, title }))} required />
                    <div className="flex flex-wrap gap-2">
                      {CLIENT_UPDATE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setUpdateForm((form) => ({
                            ...form,
                            title: preset.title,
                            body: preset.body,
                            visibleToClient: true,
                          }))}
                          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <textarea className={textareaClass} value={updateForm.body} onChange={(event) => setUpdateForm((form) => ({ ...form, body: event.target.value }))} placeholder="What changed for the client?" aria-label="Update body" required />
                    <ProjectPillSelector
                      projects={overview.projects}
                      value={updateForm.projectId}
                      onChange={(projectId) => setUpdateForm((form) => ({ ...form, projectId }))}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={updateForm.visibleToClient} onChange={(event) => setUpdateForm((form) => ({ ...form, visibleToClient: event.target.checked }))} />
                      Visible to client
                    </label>
                    <Button type="submit" loading={saving}>Publish Update</Button>
                  </form>
                </Section>

                <Section icon={BarChart3} title="Metric" count={overview.metrics.length}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitScoped(() => createClientMetric(selectedId, metricForm), "Client metric added", () => setMetricForm(emptyMetric));
                    }}
                    className="space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FormField id="metric-label" label="Label" value={metricForm.label} onChange={(label) => setMetricForm((form) => ({ ...form, label }))} required />
                      <FormField id="metric-value" label="Value" value={metricForm.value} onChange={(value) => setMetricForm((form) => ({ ...form, value }))} required />
                      <FormField id="metric-unit" label="Unit" value={metricForm.unit} onChange={(unit) => setMetricForm((form) => ({ ...form, unit }))} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={metricForm.visibleToClient} onChange={(event) => setMetricForm((form) => ({ ...form, visibleToClient: event.target.checked }))} />
                      Visible to client
                    </label>
                    <Button type="submit" loading={saving}>Add Metric</Button>
                  </form>
                </Section>

                <Section icon={LinkIcon} title="Resource" count={overview.resources.length}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitScoped(() => createClientResource(selectedId, resourceForm), "Client resource added", () => setResourceForm(emptyResource));
                    }}
                    className="space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="resource-label" label="Label" value={resourceForm.label} onChange={(label) => setResourceForm((form) => ({ ...form, label }))} required />
                      <FormField id="resource-url" label="URL" value={resourceForm.url} onChange={(url) => setResourceForm((form) => ({ ...form, url }))} required />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={resourceForm.visibleToClient} onChange={(event) => setResourceForm((form) => ({ ...form, visibleToClient: event.target.checked }))} />
                      Visible to client
                    </label>
                    <Button type="submit" loading={saving}>Add Resource</Button>
                  </form>
                </Section>

                <Section icon={Ticket} title="Tickets" count={overview.tickets.length}>
                  <div className="space-y-2">
                    {overview.tickets.length === 0 ? (
                      <EmptyState variant="compact" icon={Ticket} title="No tickets yet" />
                    ) : overview.tickets.slice(0, 6).map((ticket) => (
                      <div key={ticket.id} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{ticket.title}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, ticket.category)} / {getClientPortalOptionLabel(CLIENT_TICKET_PRIORITIES, ticket.priority)}
                            </div>
                          </div>
                          <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, ticket.status)} size="sm" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {CLIENT_TICKET_STATUSES.map((status) => {
                            const isSelected = ticket.status === status.value;

                            return (
                              <button
                                key={status.value}
                                type="button"
                                onClick={() => void handleUpdateTicketStatus(ticket, status.value)}
                                disabled={isSelected || saving}
                                aria-pressed={isSelected}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${isSelected ? "border-[var(--accent)] bg-[var(--card-surface)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
                              >
                                {status.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <AdminTicketPanel
                    ticket={selectedTicket}
                    currentUserId={user?.id}
                    replyForm={ticketReplyForm}
                    saving={saving}
                    onReplyFormChange={setTicketReplyForm}
                    onSubmitReply={handleAddTicketReply}
                  />
                </Section>
              </div>
            </div>
          ) : (
            <EmptyState icon={Users} title="Select or create a client" description="Client details, memberships, project status, tickets, updates, metrics, and resources will appear here." />
          )}
        </div>
      </div>
    </main>
  );
}
