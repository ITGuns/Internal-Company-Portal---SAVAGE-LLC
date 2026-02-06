"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
  Filter,
  SortAsc,
  Users,
  List,
  Grid,
  Calendar,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { apiFetch } from "@/lib/api";

type Task = {
  id: string;
  title: string;
  subtitle?: string; // description
  assignee?: string; // name
  assigneeId?: string;
  when?: string; // dueDate
  priority?: "Low" | "Med" | "High";
  department?: string; // name
  departmentId?: string;
  role?: string;
  notes?: { text: string; date: string }[];
  status?: string;
};

// Map backend status to frontend keys
const STATUS_MAP: Record<string, string> = {
  'todo': 'todo',
  'in_progress': 'inprogress',
  'review': 'review',
  'completed': 'done'
};

const REV_STATUS_MAP: Record<string, string> = {
  'todo': 'todo',
  'inprogress': 'in_progress',
  'review': 'review',
  'done': 'completed',
  'To Do': 'todo',
  'In Progress': 'in_progress',
  'Review': 'review',
  'Completed': 'completed'
};

function BoardCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick?.();
      }}
      onClick={onClick}
      className="p-3 mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded cursor-pointer"
      data-task-id={task.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)]">
            <span
              className={`priority-dot ${String(task.priority || "Low").toLowerCase()}`}
            />
            {task.title}
          </div>
          {task.subtitle ? (
            <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
              {task.subtitle}
            </div>
          ) : null}
          {task.notes && task.notes.length ? (
            <div className="text-xs text-[var(--muted)] mt-2">
              Latest: {task.notes[0].text}
            </div>
          ) : null}
          {task.department ? (
            <div className="text-xs text-[var(--muted)] mt-1">
              {task.department}
            </div>
          ) : null}
        </div>
        <div className="text-xs text-[var(--muted)] ml-2">{task.priority}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <>
              <div className="w-6 h-6 rounded-full bg-[var(--card-surface)] flex items-center justify-center text-[var(--muted)] uppercase text-[10px]">
                {task.assignee.charAt(0)}
              </div>
              <div className="truncate max-w-[80px]">{task.assignee}</div>
            </>
          )}
        </div>
        <div>{task.when ? new Date(task.when).toLocaleDateString() : ''}</div>
      </div>
    </div>
  );
}

export default function TaskTrackingPage() {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({ todo: [], inprogress: [], review: [], done: [] });
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"grid" | "list" | "calendar">("calendar");

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Med");
  const [departmentId, setDepartmentId] = useState("");

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState<"To Do" | "In Progress" | "Review" | "Completed">("To Do");
  const [progressNotes, setProgressNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Fetch deps
      const [deptRes, userRes, taskRes] = await Promise.all([
        apiFetch('/departments'),
        apiFetch('/users'),
        apiFetch('/tasks')
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (userRes.ok) setUsers(await userRes.json());

      if (taskRes.ok) {
        const data = await taskRes.json();
        // Group tasks
        const groups: Record<string, Task[]> = { todo: [], inprogress: [], review: [], done: [] };

        data.forEach((t: any) => {
          const key = STATUS_MAP[t.status] || 'todo';
          const frontendTask: Task = {
            id: t.id,
            title: t.title,
            subtitle: t.description || undefined,
            assignee: t.assignee?.name || undefined,
            assigneeId: t.assigneeId,
            when: t.dueDate,
            priority: (t.priority as any) || "Med",
            department: t.department?.name,
            departmentId: t.departmentId,
            notes: (t.notes as any) || [],
            status: t.status
          };
          if (groups[key]) groups[key].push(frontendTask);
        });

        setTasks(groups);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }

  function getPriorityColor(p?: Task["priority"]) {
    if (p === "High") return "#ef4444";
    if (p === "Med") return "#fb923c";
    return "#facc15";
  }

  function openNewTask() {
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setPriority("Med");
    setDepartmentId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !departmentId) return;

    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          status: 'todo',
          departmentId,
          assigneeId: assigneeId || undefined,
          priority,
          dueDate: dueDate || undefined,
          notes: []
        })
      });

      if (res.ok) {
        await loadData(); // Reload to refresh
        closeModal();
      } else {
        alert('Failed to create task');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function openEdit(t: Task, status: "To Do" | "In Progress" | "Review" | "Completed") {
    setEditTask(t);
    setEditStatus(status);
    setTitle(t.title);
    setDescription(t.subtitle || "");
    setAssigneeId(t.assigneeId || "");
    setDueDate(t.when ? new Date(t.when).toISOString().slice(0, 10) : ""); // simple date format
    setPriority(t.priority || "Med");
    setDepartmentId(t.departmentId || "");
    setProgressNotes("");
  }

  function closeEdit() {
    setEditTask(null);
    setProgressNotes("");
    resetForm();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTask) return;

    const notes = editTask.notes ? [...editTask.notes] : [];
    if (progressNotes.trim()) {
      notes.unshift({ text: progressNotes.trim(), date: new Date().toISOString() });
    }

    try {
      const res = await apiFetch(`/tasks/${editTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          description,
          status: REV_STATUS_MAP[editStatus],
          departmentId,
          assigneeId: assigneeId || null,
          priority,
          dueDate: dueDate || null,
          notes
        })
      });

      if (res.ok) {
        await loadData();
        closeEdit();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function markComplete(t: Task) {
    if (!confirm("Mark this task as completed?")) return;
    try {
      await apiFetch(`/tasks/${t.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' })
      });
      loadData();
    } catch (e) { console.error(e); }
  }

  const allTasks = [
    ...tasks.todo.map((t) => ({ ...t, status: "To Do" })),
    ...tasks.inprogress.map((t) => ({ ...t, status: "In Progress" })),
    ...tasks.review.map((t) => ({ ...t, status: "Review" })),
    ...tasks.done.map((t) => ({ ...t, status: "Completed" })),
  ];

  // Logic for Dashboard Cards
  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = allTasks.filter((t) => t.when && t.when.startsWith(todayStr));
  const overdue = allTasks.filter(
    (t) => t.when && t.when < todayStr && (t as any).status !== 'Completed'
  );

  // Calendar Events
  const events = allTasks
    .map((t) => {
      if (!t.when) return null;
      return {
        id: t.id,
        title: t.title,
        start: t.when.slice(0, 10),
        extendedProps: { ...t },
      };
    })
    .filter(Boolean) as any[];


  return (
    <main
      style={{ minHeight: "calc(100vh - var(--header-height))" }}
      className="bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0">
        <Header
          title="Task Tracking"
          subtitle="Track and manage tasks, assignments, and progress."
        />

        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={openNewTask}
              className="px-3 py-2 rounded-md flex items-center gap-2"
              style={{
                backgroundColor: "var(--foreground)",
                color: "var(--background)",
              }}
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setView("list")}
                className={`px-2 py-2 border rounded ${view === "list" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--card-bg)]"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`px-2 py-2 border rounded ${view === "grid" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--card-bg)]"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`px-2 py-2 border rounded ${view === "calendar" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--card-bg)]"}`}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VIEWS */}
          {view === "grid" && (
            <div className="flex gap-4 overflow-x-auto pb-6">
              {/* To Do */}
              <div className="min-w-[300px] flex-1">
                <div className="rounded border bg-[var(--card-bg)]">
                  <div className="p-3 border-b font-semibold">To Do ({tasks.todo.length})</div>
                  <div className="p-3 min-h-[300px]">
                    {tasks.todo.map(t => <BoardCard key={t.id} task={t} onClick={() => openEdit(t, "To Do")} />)}
                  </div>
                </div>
              </div>
              {/* In Progress */}
              <div className="min-w-[300px] flex-1">
                <div className="rounded border bg-[var(--card-bg)]">
                  <div className="p-3 border-b font-semibold">In Progress ({tasks.inprogress.length})</div>
                  <div className="p-3 min-h-[300px]">
                    {tasks.inprogress.map(t => <BoardCard key={t.id} task={t} onClick={() => openEdit(t, "In Progress")} />)}
                  </div>
                </div>
              </div>
              {/* Review */}
              <div className="min-w-[300px] flex-1">
                <div className="rounded border bg-[var(--card-bg)]">
                  <div className="p-3 border-b font-semibold">Review ({tasks.review.length})</div>
                  <div className="p-3 min-h-[300px]">
                    {tasks.review.map(t => <BoardCard key={t.id} task={t} onClick={() => openEdit(t, "Review")} />)}
                  </div>
                </div>
              </div>
              {/* Done */}
              <div className="min-w-[300px] flex-1">
                <div className="rounded border bg-[var(--card-bg)]">
                  <div className="p-3 border-b font-semibold">Completed ({tasks.done.length})</div>
                  <div className="p-3 min-h-[300px]">
                    {tasks.done.map(t => <BoardCard key={t.id} task={t} onClick={() => openEdit(t, "Completed")} />)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "list" && (
            <div className="space-y-2">
              {allTasks.map(t => (
                <div key={t.id} onClick={() => openEdit(t, t.status as any)} className="p-3 border rounded bg-[var(--card-surface)] cursor-pointer flex justify-between items-center hover:bg-[var(--card-bg)]">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-[var(--muted)]">{t.department} • {t.assignee || 'Unassigned'}</div>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="px-2 py-1 rounded bg-[var(--card-bg)]">{t.status}</span>
                    <span className="font-medium" style={{ color: getPriorityColor(t.priority) }}>{t.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "calendar" && (
            <div className="p-4 bg-[var(--card-bg)] border rounded">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                eventClick={(arg) => {
                  const props = arg.event.extendedProps;
                  // map back to Task
                  const t: Task = {
                    id: arg.event.id,
                    title: arg.event.title,
                    ...props
                  } as any;
                  openEdit(t, props.status);
                }}
                height={600}
              />
            </div>
          )}

        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {(showModal || editTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--background)] border rounded-lg w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={editTask ? closeEdit : closeModal}>✕</button>
            </div>

            <form onSubmit={editTask ? saveEdit : handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="w-full p-2 border rounded bg-[var(--card-bg)]" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full p-2 border rounded bg-[var(--card-bg)] h-24" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select className="w-full p-2 border rounded bg-[var(--card-bg)]" value={departmentId} onChange={e => setDepartmentId(e.target.value)} required>
                    <option value="">Select...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select className="w-full p-2 border rounded bg-[var(--card-bg)]" value={priority} onChange={e => setPriority(e.target.value as any)}>
                    <option value="Low">Low</option>
                    <option value="Med">Med</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Assignee</label>
                  <select className="w-full p-2 border rounded bg-[var(--card-bg)]" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input type="date" className="w-full p-2 border rounded bg-[var(--card-bg)]" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>

              {editTask && (
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="w-full p-2 border rounded bg-[var(--card-bg)]" value={editStatus} onChange={e => setEditStatus(e.target.value as any)}>
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>Review</option>
                    <option>Completed</option>
                  </select>
                </div>
              )}

              {editTask && (
                <div>
                  <label className="block text-sm font-medium mb-1">Add Note / Update</label>
                  <textarea className="w-full p-2 border rounded bg-[var(--card-bg)] h-16" value={progressNotes} onChange={e => setProgressNotes(e.target.value)} placeholder="Add a progress update..." />

                  {editTask.notes && editTask.notes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-semibold">History</div>
                      {editTask.notes.map((n, i) => (
                        <div key={i} className="text-xs p-2 bg-[var(--card-surface)] rounded border">
                          <div className="font-medium">{new Date(n.date).toLocaleString()}</div>
                          <div>{n.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={editTask ? closeEdit : closeModal} className="px-4 py-2 rounded hover:bg-[var(--card-surface)]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded">
                  {editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
