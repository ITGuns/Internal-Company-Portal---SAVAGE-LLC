"use client";

import React, { useState, useCallback, useEffect, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import { MembersPanelSkeleton, OperationsErrorState, OperationsGridSkeleton } from "@/components/operations/OperationsLoadingStates";
import { useToast } from "@/components/ToastProvider";
import { ArrowRight, BriefcaseBusiness, Building, Plus, Trash2, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { assignUserRole, removeUserRole } from "@/lib/users";
import { useUser } from "@/contexts/UserContext";
import { hasFullAccess } from "@/lib/role-access";
import {
  fetchOperationsDepartments,
  fetchOperationsMembers,
  fetchOperationsRoles,
  OPERATIONS_CORE_STALE_MS,
  OPERATIONS_MEMBERS_STALE_MS,
  OPERATIONS_QUERY_KEYS,
  syncOperationsOrgCatalog,
  type OperationsDepartment,
  type OperationsRole,
} from "@/lib/operations-data";
import type { MemberRoleAssignment, OperationsMember } from "@/lib/member-role-management";

type OperationsTab = 'departments' | 'roles' | 'members' | 'clients';

const OperationsMembersPanel = dynamic(() => import("@/components/operations/OperationsMembersPanel"), {
  loading: () => <MembersPanelSkeleton />,
});

type DeleteTarget =
  | { type: 'department'; id: string; name: string; tasks: number; roles: number }
  | { type: 'role'; id: string; name: string; departmentName?: string };

export default function OperationsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<OperationsTab>('departments');
  const [isTabPending, startTabTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [driveId, setDriveId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");

  const [loading, setLoading] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const catalogSyncAttemptedRef = useRef(false);
  const toast = useToast();
  const canManageOrgSettings = hasFullAccess(user);

  const departmentsQuery = useQuery({
    queryKey: OPERATIONS_QUERY_KEYS.departments,
    queryFn: fetchOperationsDepartments,
    staleTime: OPERATIONS_CORE_STALE_MS,
    placeholderData: keepPreviousData,
  });
  const rolesQuery = useQuery({
    queryKey: OPERATIONS_QUERY_KEYS.roles,
    queryFn: fetchOperationsRoles,
    staleTime: OPERATIONS_CORE_STALE_MS,
    placeholderData: keepPreviousData,
  });
  const membersQuery = useQuery({
    queryKey: OPERATIONS_QUERY_KEYS.members,
    queryFn: fetchOperationsMembers,
    enabled: activeTab === 'members',
    staleTime: OPERATIONS_MEMBERS_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const departments = departmentsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const members = (membersQuery.data ?? []) as OperationsMember[];
  const departmentsLoading = departmentsQuery.isPending && departments.length === 0;
  const rolesLoading = rolesQuery.isPending && roles.length === 0;
  const membersLoading = membersQuery.isPending && members.length === 0;

  const refreshCoreOperationsData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_QUERY_KEYS.departments }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_QUERY_KEYS.roles }),
    ]);
  }, [queryClient]);

  const syncOrgCatalog = useCallback(async (options: { showToast?: boolean } = {}) => {
    if (!canManageOrgSettings) return false;

    setSyncingCatalog(true);
    try {
      await syncOperationsOrgCatalog();
      await refreshCoreOperationsData();
      if (options.showToast) toast.success('Org chart departments and roles synced');
      return true;
    } catch (error) {
      console.error(error);
      if (options.showToast) toast.error('Failed to sync org chart');
      return false;
    } finally {
      setSyncingCatalog(false);
    }
  }, [canManageOrgSettings, refreshCoreOperationsData, toast]);

  const prefetchOperationsTab = useCallback((tab: OperationsTab) => {
    if (tab === 'departments') {
      void queryClient.prefetchQuery({
        queryKey: OPERATIONS_QUERY_KEYS.departments,
        queryFn: fetchOperationsDepartments,
        staleTime: OPERATIONS_CORE_STALE_MS,
      });
      return;
    }

    if (tab === 'roles') {
      void queryClient.prefetchQuery({
        queryKey: OPERATIONS_QUERY_KEYS.roles,
        queryFn: fetchOperationsRoles,
        staleTime: OPERATIONS_CORE_STALE_MS,
      });
      return;
    }

    if (tab === 'members') {
      void queryClient.prefetchQuery({
        queryKey: OPERATIONS_QUERY_KEYS.members,
        queryFn: fetchOperationsMembers,
        staleTime: OPERATIONS_MEMBERS_STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: OPERATIONS_QUERY_KEYS.roles,
        queryFn: fetchOperationsRoles,
        staleTime: OPERATIONS_CORE_STALE_MS,
      });
    }
  }, [queryClient]);

  const selectTab = useCallback((tab: OperationsTab) => {
    prefetchOperationsTab(tab);
    startTabTransition(() => setActiveTab(tab));
  }, [prefetchOperationsTab]);

  useEffect(() => {
    if (!canManageOrgSettings || catalogSyncAttemptedRef.current) return;
    catalogSyncAttemptedRef.current = true;
    void syncOrgCatalog();
  }, [canManageOrgSettings, syncOrgCatalog]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !driveId.trim()) {
      toast.error('Department name and Drive ID are required');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), driveId: driveId.trim() || undefined })
      });

      if (res.ok) {
        setShowModal(false);
        setName("");
        setDriveId("");
        toast.success('Department created successfully');
        await queryClient.invalidateQueries({ queryKey: OPERATIONS_QUERY_KEYS.departments });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create department');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleName.trim() || !roleDeptId) {
      toast.error('Role name and Department are required');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: roleName.trim(),
          departmentId: roleDeptId || undefined
        })
      });

      if (res.ok) {
        setShowRoleModal(false);
        setRoleName("");
        setRoleDeptId("");
        toast.success('Role created successfully');
        await refreshCoreOperationsData();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create role');
    } finally {
      setLoading(false);
    }
  }

  function openDepartmentDelete(department: OperationsDepartment) {
    setDeleteTarget({
      type: 'department',
      id: department.id,
      name: department.name,
      tasks: department._count?.tasks || 0,
      roles: department._count?.roles || 0,
    });
    setDeleteConfirmation("");
  }

  function openRoleDelete(role: OperationsRole) {
    setDeleteTarget({
      type: 'role',
      id: role.id,
      name: role.name,
      departmentName: role.department?.name,
    });
    setDeleteConfirmation("");
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return;

    setLoading(true);
    try {
      const endpoint = deleteTarget.type === 'department'
        ? `/departments/${deleteTarget.id}`
        : `/roles/${deleteTarget.id}`;
      const res = await apiFetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${deleteTarget.type === 'department' ? 'Department' : 'Role'} deleted successfully`);
        setDeleteTarget(null);
        setDeleteConfirmation("");
        await refreshCoreOperationsData();
      }
    } catch (e) {
      console.error(e);
      toast.error(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignMemberRole(userId: string, roleData: { role: string; departmentId?: string }) {
    try {
      await assignUserRole(userId, roleData);
      toast.success('Member role updated');
      await queryClient.invalidateQueries({ queryKey: OPERATIONS_QUERY_KEYS.members });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update member role');
      throw error;
    }
  }

  async function handleRemoveMemberRole(userId: string, assignment: MemberRoleAssignment) {
    try {
      await removeUserRole(userId, assignment);
      toast.success('Member role removed');
      await queryClient.invalidateQueries({ queryKey: OPERATIONS_QUERY_KEYS.members });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove member role');
      throw error;
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header
          title="Operations"
          subtitle="Manage departments, members, and operational roles."
        />

        <div className="mt-6">
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3" role="tablist" aria-label="Operations sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'departments'}
              onMouseEnter={() => prefetchOperationsTab('departments')}
              onFocus={() => prefetchOperationsTab('departments')}
              onClick={() => selectTab('departments')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'departments' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Departments
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'roles'}
              onMouseEnter={() => prefetchOperationsTab('roles')}
              onFocus={() => prefetchOperationsTab('roles')}
              onClick={() => selectTab('roles')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'roles' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Roles
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'members'}
              onMouseEnter={() => prefetchOperationsTab('members')}
              onFocus={() => prefetchOperationsTab('members')}
              onClick={() => selectTab('members')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'members' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Members
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'clients'}
              onClick={() => selectTab('clients')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'clients' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Clients
            </button>
            {isTabPending ? (
              <span className="ml-auto inline-flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
                Preparing section
              </span>
            ) : null}
          </div>

          <div className="flex gap-3 mb-6">
            {activeTab === 'departments' ? (
              <>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowModal(true)}
                >
                  Add Department
                </Button>
                {canManageOrgSettings ? (
                  <Button
                    variant="secondary"
                    loading={syncingCatalog}
                    onClick={() => {
                      void syncOrgCatalog({ showToast: true });
                    }}
                  >
                    Sync Org Chart
                  </Button>
                ) : null}
              </>
            ) : activeTab === 'roles' ? (
              <>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowRoleModal(true)}
                >
                  Add Role
                </Button>
                {canManageOrgSettings ? (
                  <Button
                    variant="secondary"
                    loading={syncingCatalog}
                    onClick={() => {
                      void syncOrgCatalog({ showToast: true });
                    }}
                  >
                    Sync Org Chart
                  </Button>
                ) : null}
              </>
            ) : activeTab === 'members' ? (
              <Link
                href="/operations/onboarding"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-[0_12px_32px_-22px_var(--accent)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-105 active:translate-y-px"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Onboard Member
              </Link>
            ) : activeTab === 'clients' ? (
              <Link
                href="/operations/clients"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-[0_12px_32px_-22px_var(--accent)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-105 active:translate-y-px"
              >
                Open Client Operations
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          {activeTab === 'departments' ? (
            departmentsLoading ? (
              <OperationsGridSkeleton label="Loading departments" variant="department" />
            ) : departmentsQuery.isError ? (
              <OperationsErrorState
                title="Departments did not load"
                description={departmentsQuery.error instanceof Error ? departmentsQuery.error.message : "Refresh this section to try again."}
                onRetry={() => void departmentsQuery.refetch()}
              />
            ) : departments.length === 0 ? (
              <EmptyState
                icon={Building}
                title="No departments yet"
                description="Create your first department to organize your company structure."
                actionLabel="Create first department"
                onAction={() => setShowModal(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-5 rounded-lg border bg-[var(--card-surface)] flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--card-bg)] flex items-center justify-center text-[var(--muted)]">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{dept.name}</div>
                          <div className="text-xs text-[var(--muted)]">ID: {dept.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center text-sm text-[var(--muted)]">
                      <div>
                        {dept.driveId ? (
                          <span className="text-emerald-500">GDrive Linked</span>
                        ) : (
                          <span>No Drive ID</span>
                        )}
                      </div>
                      <button
                        onClick={() => openDepartmentDelete(dept)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded text-red-500 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 dark:hover:bg-red-900/30"
                        aria-label={`Delete ${dept.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'roles' ? (
            rolesLoading ? (
              <OperationsGridSkeleton label="Loading roles" variant="role" />
            ) : rolesQuery.isError ? (
              <OperationsErrorState
                title="Roles did not load"
                description={rolesQuery.error instanceof Error ? rolesQuery.error.message : "Refresh this section to try again."}
                onRetry={() => void rolesQuery.refetch()}
              />
            ) : roles.length === 0 ? (
              <EmptyState
                icon={Building}
                title="No roles yet"
                description="Define roles that can be assigned to users in different departments."
                actionLabel="Define first role"
                onAction={() => setShowRoleModal(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => (
                  <div key={role.id} className="p-5 rounded-lg border bg-[var(--card-surface)] flex flex-col justify-between h-32">
                    <div>
                      <div className="font-bold text-lg">{role.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {role.department ? `Department: ${role.department.name}` : 'Global Role'}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => openRoleDelete(role)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded text-red-500 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 dark:hover:bg-red-900/30"
                        aria-label={`Delete role ${role.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'members' ? (
            membersLoading ? (
              <MembersPanelSkeleton />
            ) : membersQuery.isError ? (
              <OperationsErrorState
                title="Members did not load"
                description={membersQuery.error instanceof Error ? membersQuery.error.message : "Refresh this section to try again."}
                onRetry={() => void membersQuery.refetch()}
              />
            ) : (
              <OperationsMembersPanel
                members={members}
                availableRoles={roles}
                canManageMembers={canManageOrgSettings && !rolesLoading && !rolesQuery.isError}
                onAssignRole={handleAssignMemberRole}
                onRemoveRole={handleRemoveMemberRole}
              />
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-sm)]">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]">
                    <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                      Client Operations
                    </div>
                    <h2 className="mt-3 text-xl font-semibold">Manage clients from the admin workspace.</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                      Use this section for client accounts, delivery, requests, approvals, reports, assets, billing, roadmap, and calendar work.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/operations/clients"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-[0_12px_32px_-22px_var(--accent)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-105 active:translate-y-px"
                      >
                        Open Client Operations
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-5">
                <h3 className="text-sm font-semibold">Current state</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Client management stays in Operations so admins do not need to jump between the internal workspace and the client-facing portal.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Department"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="dept-name"
            label="Department Name"
            value={name}
            onChange={(value) => setName(value)}
            placeholder="e.g., Logistics, Marketing"
            required
          />
          <FormField
            id="dept-drive-id"
            label="Google Drive ID"
            value={driveId}
            onChange={(value) => setDriveId(value)}
            placeholder="Enter Google Drive folder ID"
            required={true}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading}>Create Department</Button>
          </div>
        </form>
      </Modal>

      {/* Add Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Add Role"
        size="md"
      >
        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <FormField
            id="role-name"
            label="Role Name"
            value={roleName}
            onChange={(value) => setRoleName(value)}
            placeholder="e.g., Manager, Developer"
            required
          />
          <div>
            <label className="block text-sm font-medium mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={roleDeptId}
              onChange={(e) => setRoleDeptId(e.target.value)}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
              aria-label="Department Attachment"
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)] mt-1 italic">Associate this role with a specific department or leave empty for a global role.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading}>Create Role</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteConfirmation("");
        }}
        title={deleteTarget ? `Delete ${deleteTarget.type}` : "Delete"}
        size="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
              <div className="font-semibold text-red-600 dark:text-red-400">
                This action cannot be undone.
              </div>
              <p className="mt-2 text-[var(--foreground)]">
                You are deleting <strong>{deleteTarget.name}</strong>.
              </p>
              {deleteTarget.type === 'department' && (
                <p className="mt-2 text-[var(--muted)]">
                  Current linked records: {deleteTarget.tasks} task{deleteTarget.tasks === 1 ? '' : 's'} and {deleteTarget.roles} user role{deleteTarget.roles === 1 ? '' : 's'}.
                </p>
              )}
              {deleteTarget.type === 'role' && (
                <p className="mt-2 text-[var(--muted)]">
                  This removes the role option{deleteTarget.departmentName ? ` for ${deleteTarget.departmentName}` : ''}. Existing user assignments are not automatically changed.
                </p>
              )}
            </div>

            <FormField
              id="delete-confirmation"
              label={`Type "${deleteTarget.name}" to confirm`}
              value={deleteConfirmation}
              onChange={setDeleteConfirmation}
              placeholder={deleteTarget.name}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleDeleteConfirmed}
                loading={loading}
                disabled={deleteConfirmation !== deleteTarget.name}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
