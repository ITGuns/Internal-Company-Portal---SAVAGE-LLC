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
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [driveId, setDriveId] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function loadData() {
    try {
      const res = await apiFetch('/departments');
      if (res.ok) {
        setDepartments(await res.json());
      } else {
        toast.error('Failed to load departments');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while loading departments');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Department name is required');
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
      } else {
        toast.error('Failed to create department');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while creating department');
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
      } else {
        toast.error('Failed to delete department');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while deleting department');
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header
          title="Operations"
          subtitle="Manage departments and operational structures."
        />

        <div className="mt-6">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
            className="mb-6"
          >
            Add Department
          </Button>

          {departments.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No departments yet"
              description="Get started by creating your first department to organize your company structure."
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
          )}
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setName("");
          setDriveId("");
        }}
        title="Add Department"
        subtitle="Create a new department to organize your company structure"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="dept-name"
            label="Department Name"
            value={name}
            onChange={(value) => setName(value)}
            placeholder="e.g., Logistics, Marketing, Sales"
            required
            helperText="A descriptive name for this department"
          />

          <FormField
            id="dept-drive-id"
            label="Google Drive ID (Optional)"
            value={driveId}
            onChange={(value) => setDriveId(value)}
            placeholder="Enter Google Drive folder ID"
            helperText="Used for syncing department files with Google Drive"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setName("");
                setDriveId("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
