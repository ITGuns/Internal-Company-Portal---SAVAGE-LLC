"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Plus, Trash2, AlertCircle, Info, Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "Normal" | "High" | "Critical";
  createdAt: string;
  author: {
    name: string | null;
    avatar: string | null;
  } | null;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High" | "Critical">("Normal");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await apiFetch('/announcements');
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) { console.error(e); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return;

    try {
      const res = await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, content, priority })
      });
      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setContent("");
        setPriority("Normal");
        loadData();
      }
    } catch (e) { console.error(e); }
  }

  function getPriorityColor(p: string) {
    if (p === 'Critical') return 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/20';
    if (p === 'High') return 'text-orange-500 border-orange-500 bg-orange-50 dark:bg-orange-900/20';
    return 'text-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20';
  }

  function getIcon(p: string) {
    if (p === 'Critical') return <AlertCircle className="w-5 h-5" />;
    if (p === 'High') return <Bell className="w-5 h-5" />;
    return <Info className="w-5 h-5" />;
  }

  return (
    <main
      style={{ minHeight: "calc(100vh - var(--header-height))" }}
      className="bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0">
        <Header
          title="Announcements"
          subtitle="Company-wide updates and important notices."
        />

        <div className="mt-6">
          <button
            onClick={() => setShowModal(true)}
            className="mb-6 px-4 py-2 rounded-md flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)]"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>

          <div className="grid gap-4 max-w-4xl">
            {announcements.length === 0 && (
              <div className="p-8 text-center text-[var(--muted)] border rounded border-dashed">
                No announcements yet.
              </div>
            )}

            {announcements.map((a) => (
              <div key={a.id} className={`p-4 rounded-lg border flex gap-4 ${getPriorityColor(a.priority)} bg-opacity-10 border-opacity-30`}>
                <div className={`p-2 rounded-full h-fit mt-1 ${getPriorityColor(a.priority).split(' ')[0]} bg-white dark:bg-black bg-opacity-50`}>
                  {getIcon(a.priority)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{a.title}</h3>
                      <div className="text-xs opacity-70 mb-2">
                        Posted by {a.author?.name || 'Admin'} • {new Date(a.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-black/10 rounded text-[var(--muted)] hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed opacity-90">
                    {a.content}
                  </p>
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
              <h2 className="text-xl font-bold">New Announcement</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="w-full p-2 border rounded bg-[var(--card-bg)]" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Office Closure Notice" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select className="w-full p-2 border rounded bg-[var(--card-bg)]" value={priority} onChange={e => setPriority(e.target.value as any)}>
                  <option value="Normal">Normal (Info)</option>
                  <option value="High">High (Important)</option>
                  <option value="Critical">Critical (Action Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea className="w-full p-2 border rounded bg-[var(--card-bg)] h-32" value={content} onChange={e => setContent(e.target.value)} required placeholder="Type your message here..." />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded hover:bg-[var(--card-surface)]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded">
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
