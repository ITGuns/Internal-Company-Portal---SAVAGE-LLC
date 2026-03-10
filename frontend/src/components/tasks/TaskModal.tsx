"use client";

import React from "react";
import Button from "@/components/Button";
import { Trash2 } from "lucide-react";
import { DEPARTMENT_ROLES } from "@/lib/departments";
import type { TaskPriority, TaskStatus, TaskDepartment, TaskUser, Task } from "@/lib/tasks";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

interface TaskModalProps {
  editTaskData: Task | null;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  assigneeId: number | string;
  setAssigneeId: (v: number | string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  departmentId: string;
  setDepartmentId: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  status: TaskStatus;
  setStatus: (v: TaskStatus) => void;
  estimatedTime: string;
  setEstimatedTime: (v: string) => void;
  progressNotes: string;
  setProgressNotes: (v: string) => void;
  departments: TaskDepartment[];
  users: TaskUser[];
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function TaskModal({
  editTaskData,
  title,
  setTitle,
  description,
  setDescription,
  assigneeId,
  setAssigneeId,
  dueDate,
  setDueDate,
  startDate,
  setStartDate,
  priority,
  setPriority,
  departmentId,
  setDepartmentId,
  role,
  setRole,
  status,
  setStatus,
  estimatedTime,
  setEstimatedTime,
  progressNotes,
  setProgressNotes,
  departments,
  users,
  onSubmit,
  onDelete,
  onClose,
}: TaskModalProps) {
  const selectedDepartmentName = departments.find(
    (d) => d.id?.toString() === departmentId?.toString()
  )?.name;
  const availableRoles = selectedDepartmentName
    ? DEPARTMENT_ROLES[selectedDepartmentName] || []
    : [];

  return (
    <div
      className="fixed z-50 flex items-start justify-center bg-gray-100/80 pt-20"
      style={{
        top: 0,
        left: "var(--sidebar-width, 16rem)",
        right: 0,
        bottom: 0,
      }}
    >
      <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto shadow-lg border border-[var(--border)] chat-scroll">
        <div className="flex items-start justify-between mb-6">
          <h3 className="text-lg font-semibold">
            {editTaskData ? "Edit Task" : "Create New Task"}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium">
                Task Name <span className="text-red-500">*</span>
              </label>
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
            <label className="block text-sm mb-1 font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about this task..."
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] h-24 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setRole("");
                }}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                required
                aria-label="Department"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                aria-label="Priority"
                required
              >
                <option value="Low">Low</option>
                <option value="Med">Med</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium">
                Assign To <span className="text-red-500">*</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                aria-label="Assign To"
                required
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium">
                Role <span className="text-red-500">*</span>
              </label>
              {role === "Other" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Enter role manually..."
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                    autoFocus
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRole("")}
                    className="px-3"
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={!departmentId}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
                  aria-label="Role"
                  required
                >
                  <option value="">Select role</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="Other">Other (Manual Entry)...</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                aria-label="Start Date"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                aria-label="Due Date"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 font-medium">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                aria-label="Status"
                required
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">
                ETOC (Est. Minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="e.g. 60"
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
          </div>

          {editTaskData && (
            <div>
              <label className="block text-sm mb-1 font-medium">
                Add Progress Note
              </label>
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
                onClick={onDelete}
                className="flex items-center gap-2 text-[var(--status-blocked)] hover:opacity-80 font-medium px-4 py-2 rounded hover:bg-[var(--status-blocked-bg)]"
              >
                <Trash2 className="w-4 h-4" /> Delete Task
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose} type="button">
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
  );
}
