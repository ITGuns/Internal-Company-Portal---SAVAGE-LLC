"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import { Plus, Trash2, Building } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Department = {
  id: string;
  name: string;
  driveId?: string;
  description?: string;
};

export default function OperationsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'departments' | 'roles'>('departments');

  // Form states
  const [name, setName] = useState("");
  const [driveId, setDriveId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function loadData() {
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
  }

  useEffect(() => {
    loadData();
  }, []);

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

  async function handleDelete(id: string, departmentName: string) {
    if (!confirm(`Delete "${departmentName}"? This may affect users/tasks linked to it.`)) return;

    try {
      const res = await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Department deleted successfully');
        loadData();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete department');
    }
  }

  async function handleDeleteRole(id: string, roleName: string) {
    if (!confirm(`Delete role "${roleName}"?`)) return;

    try {
      const res = await apiFetch(`/roles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Role deleted successfully');
        loadData();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete role');
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
          <div className="flex items-center gap-4 border-b border-[var(--border)] mb-6">
            <button
              onClick={() => setActiveTab('departments')}
              className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'departments' ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Departments
              {activeTab === 'departments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'roles' ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Roles
              {activeTab === 'roles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
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
            ) : (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowRoleModal(true)}
              >
                Add Role
              </Button>
            )}
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
                        onClick={() => handleDelete(dept.id, dept.name)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                        aria-label={`Delete ${dept.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
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
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                        aria-label={`Delete role ${role.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
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
    </main>
  );
}
