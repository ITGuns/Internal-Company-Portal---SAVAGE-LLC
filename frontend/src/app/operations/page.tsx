"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
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

  async function loadData() {
    try {
      const res = await apiFetch('/departments');
      if (res.ok) setDepartments(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({ name, driveId })
      });
      if (res.ok) {
        setShowModal(false);
        setName("");
        setDriveId("");
        loadData();
      }
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete department? This may affect users/tasks linked to it.")) return;
    try {
      await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) { console.error(e); }
  }

  return (
    <main
      style={{ minHeight: "calc(100vh - var(--header-height))" }}
      className="bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0">
        <Header
          title="Operations"
          subtitle="Manage departments and operational structures."
        />

        <div className="mt-6">
          <button
            onClick={() => setShowModal(true)}
            className="mb-6 px-4 py-2 rounded-md flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)]"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>

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
                  <button onClick={() => handleDelete(dept.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--background)] border rounded-lg w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Add Department</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input className="w-full p-2 border rounded bg-[var(--card-bg)]" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Logistics" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Combined Google Drive ID (Optional)</label>
                <input className="w-full p-2 border rounded bg-[var(--card-bg)]" value={driveId} onChange={e => setDriveId(e.target.value)} placeholder="Folder ID..." />
                <p className="text-xs text-[var(--muted)] mt-1">Used for syncing department files.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded hover:bg-[var(--card-surface)]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
