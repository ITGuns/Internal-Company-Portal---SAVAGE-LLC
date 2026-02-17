"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useToast } from "@/components/ToastProvider";
import { DEPARTMENT_ROLES } from '@/lib/departments';
import {
  Filter,
  SortAsc,
  Users,
  List,
  Grid,
  Calendar as CalendarIcon,
  Plus,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import LoadingSpinner from '@/components/LoadingSpinner';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchDepartments,
  fetchUsers,
  getTaskViewPreference,
  saveTaskViewPreference,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskDepartment,
  type TaskUser
} from "@/lib/tasks";

// Map backend status to nice labels
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed"
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: "var(--priority-low)",
  Med: "var(--priority-medium)",
  High: "var(--priority-high)",
};

function BoardCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const assigneeName = task.assignee?.name || task.assignee?.email || "Unassigned";
  const deptName = task.department?.name || "";

  return (
    <Card
      padding="sm"
      className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-task-id={task.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)]">
            <span
              className={`priority-dot ${task.priority.toLowerCase()}`}
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            />
            {task.title}
          </div>
          {task.description ? (
            <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
              {task.description}
            </div>
          ) : null}
          {task.notes && task.notes.length ? (
            <div className="text-xs text-[var(--muted)] mt-2 italic">
              Latest: {task.notes[0].text}
            </div>
          ) : null}
          {(deptName || task.role) ? (
            <div className="text-xs text-[var(--muted)] mt-1 font-medium">
              {[deptName, task.role].filter(Boolean).join(" — ")}
            </div>
          ) : null}
        </div>
        <div className="text-xs text-[var(--muted)] ml-2 whitespace-nowrap">{task.priority}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--card-bg)] flex items-center justify-center text-[var(--muted)] border border-[var(--border)] overflow-hidden">
            {task.assignee?.avatar ? (
              <img src={task.assignee.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{assigneeName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="truncate max-w-[80px]">{assigneeName}</div>
        </div>
        <div>{task.dueDate || "No due date"}</div>
      </div>
    </Card>
  );
}

export default function TaskTrackingPage() {
  const toast = useToast();

  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<TaskDepartment[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"grid" | "list" | "calendar">('calendar');

  // Load initial data
  useEffect(() => {
    // Load preference immediately to avoid flash
    setView(getTaskViewPreference());

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tasksData, deptsData, usersData] = await Promise.all([
          fetchTasks(),
          fetchDepartments(),
          fetchUsers()
        ]);
        setTasks(tasksData);
        setDepartments(deptsData);
        setUsers(usersData);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load task data:", error);
        toast.error("Failed to load tasks");
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  // Save view preference whenever it changes
  useEffect(() => {
    saveTaskViewPreference(view);
  }, [view]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Med");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");

  const [editTaskData, setEditTaskData] = useState<Task | null>(null);
  const [progressNotes, setProgressNotes] = useState("");

  function openNewTask() {
    setEditTaskData(null);
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setPriority("Med");
    setDepartmentId("");
    setRole("");
    setStatus("todo");
    setProgressNotes("");
    setShowModal(true);
  }

  function openEdit(task: Task) {
    setEditTaskData(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setAssigneeId(task.assigneeId || "");
    setDueDate(task.dueDate || "");
    setPriority(task.priority);
    setDepartmentId(task.departmentId || "");
    setRole(task.role || "");
    setStatus(task.status);
    setProgressNotes("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTaskData(null);
  }

  // Derived Department for role filtering
  const selectedDepartmentName = departments.find(d => d.id === departmentId)?.name;
  const availableRoles = selectedDepartmentName ? (DEPARTMENT_ROLES[selectedDepartmentName] || []) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!departmentId) {
      toast.error("Please select a department");
      return;
    }

    try {
      if (editTaskData) {
        // Update existing
        const updates: any = {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          departmentId,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          role: role || undefined,
        };

        if (progressNotes.trim()) {
          updates.notes = [
            { text: progressNotes.trim(), date: new Date().toISOString() },
            ...(editTaskData.notes || [])
          ];
        }

        const updated = await updateTask(editTaskData.id, updates);
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        toast.success("Task updated");
      } else {
        // Create new
        const created = await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          departmentId,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          role: role || undefined,
          notes: []
        });
        setTasks(prev => [created, ...prev]);
        toast.success("Task created");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save task");
    }
  }

  async function handleDelete() {
    if (!editTaskData) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(editTaskData.id);
      setTasks(prev => prev.filter(t => t.id !== editTaskData.id));
      toast.success("Task deleted");
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete task");
    }
  }

  // Filtered lists for Grid View
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Stats for "Today" and "Overdue" (client-side calculation)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(t => t.dueDate === todayStr && t.status !== 'completed');
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed');
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  // Calendar Events
  const events = tasks
    .map((t) => {
      if (!t.dueDate) return null;
      return {
        id: t.id,
        title: t.title,
        start: t.dueDate,
        extendedProps: { task: t },
        color: t.status === 'completed' ? 'var(--status-completed)' : (t.status === 'in_progress' ? 'var(--status-in-progress)' : 'var(--status-pending)')
      };
    })
    .filter(Boolean) as any[];


  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Loading tasks..." />
      </div>
    );
  }

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
            <Button
              onClick={openNewTask}
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
            >
              New Task
            </Button>
            <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
            <Button variant="secondary" icon={<SortAsc className="w-4 h-4" />}>
              Sort
            </Button>
            <Button variant="secondary" icon={<Users className="w-4 h-4" />}>
              Group by
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                variant={view === "list" ? "primary" : "secondary"}
                icon={<List className="w-4 h-4" />}
                size="sm"
              />
              <Button
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                variant={view === "grid" ? "primary" : "secondary"}
                icon={<Grid className="w-4 h-4" />}
                size="sm"
              />
              <Button
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
                variant={view === "calendar" ? "primary" : "secondary"}
                icon={<CalendarIcon className="w-4 h-4" />}
                size="sm"
              />
            </div>
          </div>

          {view === "grid" && (
            <div>
              {tasks.length === 0 && (
                <div className="pb-6 text-center text-[var(--muted)] py-20">
                  <div className="text-2xl font-semibold">No tasks yet</div>
                  <div className="mt-2">Create a new task to get started.</div>
                </div>
              )}

              {tasks.length > 0 && (
                <div className="overflow-x-auto pb-6">
                  <div className="flex gap-4 min-w-[1100px]">
                    {[
                      { status: 'todo', items: todoTasks, label: 'To Do' },
                      { status: 'in_progress', items: inProgressTasks, label: 'In Progress' },
                      { status: 'review', items: reviewTasks, label: 'Review' },
                      { status: 'completed', items: completedTasks, label: 'Completed' }
                    ].map(col => (
                      <div className="w-100" key={col.status}>
                        <Card className="overflow-hidden bg-[var(--card-bg)]">
                          <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]">
                            <div className="text-sm font-semibold">
                              {col.label}{" "}
                              <span className="text-xs text-[var(--muted)] ml-1">
                                {col.items.length}
                              </span>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                          </div>
                          <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">
                            {col.items.map((t) => (
                              <BoardCard
                                key={t.id}
                                task={t}
                                onClick={() => openEdit(t)}
                              />
                            ))}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "list" && (
            <div className="pb-6">
              {tasks.length === 0 ? (
                <div className="text-center text-[var(--muted)] py-20">
                  <div className="text-2xl font-semibold">No tasks yet</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openEdit(t)}
                      className="p-3 bg-[var(--card-surface)] border border-[var(--border)] rounded flex items-center justify-between cursor-pointer hover:bg-[var(--card-bg)] transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                          />
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-xs text-[var(--muted)] mt-1 line-clamp-1">{t.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                        <div className="px-2 py-1 bg-[var(--card-bg)] rounded border border-[var(--border)]">
                          {STATUS_LABELS[t.status]}
                        </div>
                        <div className="w-24 truncate text-right">
                          {t.assignee ? (t.assignee.name || t.assignee.email) : 'Unassigned'}
                        </div>
                        <div className="w-24 text-right">{t.dueDate || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "calendar" && (
            <div className="pb-6 space-y-6">
              <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek,dayGridDay",
                  }}
                  events={events}
                  eventClick={(arg) => {
                    if (arg.event.extendedProps.task) {
                      openEdit(arg.event.extendedProps.task);
                    }
                  }}
                  height={600}
                />
              </div>

              {/* Weekly Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex justify-between">
                    <div className="text-sm font-semibold">Due Today</div>
                    <div className="text-xs text-[var(--muted)]">{todaysTasks.length}</div>
                  </div>
                  <div className="p-3">
                    {todaysTasks.length === 0 ? (
                      <div className="text-xs text-[var(--muted)] text-center py-4">No tasks due today</div>
                    ) : (
                      <ul className="space-y-2">
                        {todaysTasks.map(t => (
                          <li key={t.id} onClick={() => openEdit(t)} className="p-2 border border-[var(--border)] rounded text-sm cursor-pointer hover:bg-[var(--card-bg)]">
                            <div className="font-medium">{t.title}</div>
                            <div className="text-xs text-[var(--muted)]">{t.department?.name}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Overdue */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex justify-between">
                    <div className="text-sm font-semibold text-[var(--status-blocked)]">Overdue</div>
                    <div className="text-xs text-[var(--muted)]">{overdueTasks.length}</div>
                  </div>
                  <div className="p-3">
                    {overdueTasks.length === 0 ? (
                      <div className="text-xs text-[var(--muted)] text-center py-4">No overdue tasks</div>
                    ) : (
                      <ul className="space-y-2">
                        {overdueTasks.slice(0, 3).map(t => (
                          <li key={t.id} onClick={() => openEdit(t)} className="p-2 border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded text-sm cursor-pointer">
                            <div className="font-medium">{t.title}</div>
                            <div className="text-xs text-[var(--status-blocked)]">Due: {t.dueDate}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">Overview</div>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3">
                    <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
                      <div className="text-lg font-bold">{tasks.length}</div>
                      <div className="text-xs text-[var(--muted)]">Total</div>
                    </div>
                    <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
                      <div className="text-lg font-bold text-[var(--status-completed)]">{completedCount}</div>
                      <div className="text-xs text-[var(--muted)]">Done</div>
                    </div>
                    <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
                      <div className="text-lg font-bold text-[var(--status-in-progress)]">{inProgressCount}</div>
                      <div className="text-xs text-[var(--muted)]">Active</div>
                    </div>
                    <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
                      <div className="text-lg font-bold text-[var(--status-blocked)]">{overdueTasks.length}</div>
                      <div className="text-xs text-[var(--muted)]">Overdue</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed z-50 flex items-start justify-center bg-gray-100/80 pt-20"
          style={{
            top: 0,
            left: "var(--sidebar-width, 16rem)",
            right: 0,
            bottom: 0,
          }}
        >
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto shadow-lg border border-[var(--border)]">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg font-semibold">{editTaskData ? "Edit Task" : "Create New Task"}</h3>
              <button
                onClick={closeModal}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">Task Name</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us more about this task..."
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] h-24 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">Department *</label>
                  <select
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setRole(""); // Reset role on department change
                    }}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1 font-medium">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                  >
                    <option value="Low">Low</option>
                    <option value="Med">Med</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">Assign To</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1 font-medium">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">Role (optional)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={!departmentId}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
                  >
                    <option value="">Select role</option>
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editTaskData && (
                <div>
                  <label className="block text-sm mb-1 font-medium">Add Progress Note</label>
                  <textarea
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Add a note about recent progress..."
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] h-20"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                {editTaskData ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 text-[var(--status-blocked)] hover:opacity-80 font-medium px-4 py-2 rounded hover:bg-[var(--status-blocked-bg)]"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Task
                  </button>
                ) : (
                  <div></div> // Spacer
                )}

                <div className="flex items-center gap-3">
                  <Button variant="secondary" onClick={closeModal} type="button">
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    {editTaskData ? "Save Changes" : "Create Task"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
