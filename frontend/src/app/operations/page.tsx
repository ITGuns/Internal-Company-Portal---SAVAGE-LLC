"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import { ArrowRight, BriefcaseBusiness, Building, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Department = {
  id: string;
  name: string;
  driveId?: string;
  description?: string;
  _count?: {
    tasks?: number;
    roles?: number;
  };
};

type Role = {
  id: string;
  name: string;
  department?: {
    id: string;
    name: string;
  } | null;
};

type DeleteTarget =
  | { type: 'department'; id: string; name: string; tasks: number; roles: number }
  | { type: 'role'; id: string; name: string; departmentName?: string };

export default function OperationsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'departments' | 'roles' | 'clients'>('departments');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [driveId, setDriveId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        apiFetch('/departments'),
        apiFetch('/roles')
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (roleRes.ok) setRoles(await roleRes.json());
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while loading data');
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        loadData();
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
        loadData();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create role');
    } finally {
      setLoading(false);
    }
  }

  function openDepartmentDelete(department: Department) {
    setDeleteTarget({
      type: 'department',
      id: department.id,
      name: department.name,
      tasks: department._count?.tasks || 0,
      roles: department._count?.roles || 0,
    });
    setDeleteConfirmation("");
  }

  function openRoleDelete(role: Role) {
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
        loadData();
      }
    } catch (e) {
      console.error(e);
      toast.error(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header
          title="Operations"
          subtitle="Manage departments and operational roles."
        />

        <div className="mt-6">
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3" role="tablist" aria-label="Operations sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'departments'}
              onClick={() => setActiveTab('departments')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'departments' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Departments
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'roles'}
              onClick={() => setActiveTab('roles')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'roles' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Roles
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'clients'}
              onClick={() => setActiveTab('clients')}
              className={`min-h-10 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'clients' ? 'border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]' : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'}`}
            >
              Clients
            </button>
          </div>

          <div className="flex gap-3 mb-6">
            {activeTab === 'departments' ? (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowModal(true)}
              >
                Add Department
              </Button>
            ) : activeTab === 'roles' ? (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowRoleModal(true)}
              >
                Add Role
              </Button>
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
            departments.length === 0 ? (
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
            roles.length === 0 ? (
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
