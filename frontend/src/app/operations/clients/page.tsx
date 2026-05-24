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
  ShieldCheck,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import Button from "@/components/Button";
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
  createClientMembership,
  createClientMetric,
  createClientOrganization,
  createClientProject,
  createClientResource,
  createClientUpdate,
  fetchClientMemberships,
  fetchClientOrganizations,
  fetchClientOverview,
} from "@/lib/client-portal";
import { buildClientPortalSummary } from "@/lib/client-portal-summary";
import { hasClientOperationsAccess } from "@/lib/role-access";
import { fetchUsers, User } from "@/lib/users";

const selectClass = "w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

const emptyOrg = { name: "", slug: "", websiteUrl: "", notes: "" };
const emptyMember = { userId: "", role: "client", status: "active" };
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
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const [metricForm, setMetricForm] = useState(emptyMetric);
  const [resourceForm, setResourceForm] = useState(emptyResource);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId) || overview?.organization || null,
    [organizations, overview, selectedId],
  );
  const summary = useMemo(() => buildClientPortalSummary(overview), [overview]);
  const canManageClients = useMemo(() => hasClientOperationsAccess(user), [user]);

  const loadOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    setOrganizations(nextOrganizations);
    setSelectedId((current) => current || nextOrganizations[0]?.id || "");
  }, []);

  const loadSelected = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setOverview(null);
      setMemberships([]);
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
                <FormField id="client-slug" label="Slug" value={orgForm.slug} onChange={(slug) => setOrgForm((form) => ({ ...form, slug }))} placeholder="gem-field-hvac" />
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
                    className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]"
                  >
                    <select className={selectClass} value={memberForm.userId} onChange={(event) => setMemberForm((form) => ({ ...form, userId: event.target.value }))} aria-label="Client member user" required>
                      <option value="">Select user</option>
                      {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
                    </select>
                    <input className={selectClass} value={memberForm.role} onChange={(event) => setMemberForm((form) => ({ ...form, role: event.target.value }))} aria-label="Client member role" />
                    <select className={selectClass} value={memberForm.status} onChange={(event) => setMemberForm((form) => ({ ...form, status: event.target.value }))} aria-label="Client member status">
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
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

                <Section icon={Activity} title="Project">
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
                      <FormField id="project-status" label="Status" value={projectForm.status} onChange={(status) => setProjectForm((form) => ({ ...form, status }))} />
                      <FormField id="project-progress" label="Progress" type="number" min={0} max={100} value={projectForm.progress} onChange={(progress) => setProjectForm((form) => ({ ...form, progress }))} />
                    </div>
                    <textarea className={textareaClass} value={projectForm.summary} onChange={(event) => setProjectForm((form) => ({ ...form, summary: event.target.value }))} placeholder="Client-visible summary" aria-label="Project summary" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="project-live" label="Live URL" value={projectForm.liveUrl} onChange={(liveUrl) => setProjectForm((form) => ({ ...form, liveUrl }))} />
                      <FormField id="project-preview" label="Preview URL" value={projectForm.previewUrl} onChange={(previewUrl) => setProjectForm((form) => ({ ...form, previewUrl }))} />
                    </div>
                    <Button type="submit" loading={saving}>Create Project</Button>
                  </form>
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
                    <textarea className={textareaClass} value={updateForm.body} onChange={(event) => setUpdateForm((form) => ({ ...form, body: event.target.value }))} placeholder="What changed for the client?" aria-label="Update body" required />
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
                      <div key={ticket.id} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate text-sm font-medium">{ticket.title}</div>
                          <StatusBadge label={ticket.status} size="sm" />
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{ticket.category} / {ticket.priority}</div>
                      </div>
                    ))}
                  </div>
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
