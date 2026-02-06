"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Plus, Trash2, Edit2, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";

type DailyLog = {
  id: string;
  content: string;
  date: string;
  createdAt: string;
  author: {
    name: string | null;
    avatar: string | null;
  } | null;
};

export default function DailyLogsPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editLog, setEditLog] = useState<DailyLog | null>(null);

  // Form
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await apiFetch('/daily-logs');
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }

  function openNew() {
    setEditLog(null);
    setContent("");
    setDate(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  }

  function openEdit(log: DailyLog) {
    setEditLog(log);
    setContent(log.content);
    setDate(new Date(log.date).toISOString().slice(0, 10));
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this log?")) return;
    try {
      await apiFetch(`/daily-logs/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) { console.error(e); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content) return;

    try {
      const body = JSON.stringify({ content, date });
      let res;

      if (editLog) {
        res = await apiFetch(`/daily-logs/${editLog.id}`, { method: 'PATCH', body });
      } else {
        res = await apiFetch('/daily-logs', { method: 'POST', body });
      }

      if (res && res.ok) {
        setShowModal(false);
        loadData();
      }
    } catch (e) { console.error(e); }
  }

  return (
    <main
      style={{ minHeight: "calc(100vh - var(--header-height))" }}
      className="bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0">
        <Header
          title="Daily Logs"
          subtitle="Record your daily progress and activities."
        />

        <div className="mt-6">
          <button
            onClick={openNew}
            className="mb-6 px-4 py-2 rounded-md flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)]"
          >
            <Plus className="w-4 h-4" /> New Log Entry
          </button>

          <div className="grid gap-6 max-w-4xl">
            {logs.length === 0 && (
              <div className="p-8 text-center text-[var(--muted)] border rounded border-dashed">
                No logs found.
              </div>
            )}

            {logs.map((log) => (
              <div key={log.id} className="p-5 rounded-lg border bg-[var(--card-surface)] relative group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--card-bg)] flex items-center justify-center font-bold text-[var(--muted)]">
                      {log.author?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-semibold">{log.author?.name || 'Unknown'}</div>
                      <div className="text-xs text-[var(--muted)] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(log)} className="p-2 hover:bg-[var(--card-bg)] rounded text-[var(--muted)]">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(log.id)} className="p-2 hover:bg-[var(--card-bg)] rounded text-[var(--muted)] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed border-l-2 border-[var(--border)] pl-4 ml-1">
                  {log.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--background)] border rounded-lg w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editLog ? 'Edit Log' : 'New Log Entry'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" className="w-full p-2 border rounded bg-[var(--card-bg)]" value={date} onChange={e => setDate(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea className="w-full p-2 border rounded bg-[var(--card-bg)] h-40" value={content} onChange={e => setContent(e.target.value)} required placeholder="What did you work on today?" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded hover:bg-[var(--card-surface)]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded">
                  {editLog ? 'Save Changes' : 'Submit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
