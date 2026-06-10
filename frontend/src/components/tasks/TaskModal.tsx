"use client";

import React from "react";
import Button from "@/components/Button";
import SegmentedDateInput from "@/components/forms/SegmentedDateInput";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { Trash2, X } from "lucide-react";
import type { TaskPriority, TaskStatus, TaskDepartment, TaskUser, Task, TaskProject } from "@/lib/tasks";
import { getPrimaryTaskAssignmentFromRoles } from "@/lib/task-access";
import {
  formatEstimatedMinutesAsClock,
  getLocalTodayDateInput,
  parseEstimatedClockToMinutes,
} from "@/lib/task-estimate";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const fieldControlClass =
  "w-full min-h-10 rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";
const selectControlClass = `${fieldControlClass} portal-select`;

interface TaskModalProps {
  editTaskData: Task | null;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  assigneeId: number | string;
  setAssigneeId: (v: number | string) => void;
  collaboratorIds: string[];
  setCollaboratorIds: (v: string[]) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  departmentId: string;
  setDepartmentId: (v: string) => void;
  projectId: string;
  setProjectId: (v: string) => void;
  setRole: (v: string) => void;
  status: TaskStatus;
  setStatus: (v: TaskStatus) => void;
  estimatedTime: string;
  setEstimatedTime: (v: string) => void;
  progress: number;
  progressNotes: string;
  setProgressNotes: (v: string) => void;
  departments: TaskDepartment[];
  users: TaskUser[];
  projects: TaskProject[];
  canManageAssignments: boolean;
  onCreateDepartment?: (name: string) => Promise<void>;
  assignmentSummary?: {
    assigneeName: string;
    departmentName?: string;
    role?: string;
    isReady: boolean;
  };
  onAssignToCurrentUser?: () => void;
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
  collaboratorIds,
  setCollaboratorIds,
  dueDate,
  setDueDate,
  startDate,
  setStartDate,
  priority,
  setPriority,
  departmentId,
  setDepartmentId,
  projectId,
  setProjectId,
  setRole,
  status,
  setStatus,
  estimatedTime,
  setEstimatedTime,
  progress,
  progressNotes,
  setProgressNotes,
  departments,
  users,
  projects,
  canManageAssignments,
  onCreateDepartment,
  assignmentSummary,
  onAssignToCurrentUser,
  onSubmit,
  onDelete,
  onClose,
}: TaskModalProps) {
  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();
  const fieldIdPrefix = React.useId();
  const { dialogRef, handleDialogKeyDown } = useDialogA11y({ onClose });
  const [showDepartmentCreate, setShowDepartmentCreate] = React.useState(false);
  const [newDepartmentName, setNewDepartmentName] = React.useState("");
  const [isCreatingDepartment, setIsCreatingDepartment] = React.useState(false);
  const todayDate = getLocalTodayDateInput();

  function normalizeEstimatedTime() {
    const minutes = parseEstimatedClockToMinutes(estimatedTime);
    if (!minutes) return;

    setEstimatedTime(formatEstimatedMinutesAsClock(minutes));
  }

  function handleAssigneeChange(nextAssigneeId: string) {
    setAssigneeId(nextAssigneeId);
    setCollaboratorIds(collaboratorIds.filter((userId) => String(userId) !== String(nextAssigneeId)));

    const selectedUser = users.find((user) => String(user.id) === String(nextAssigneeId));
    const selectedAssignment = getPrimaryTaskAssignmentFromRoles(selectedUser?.roles);
    if (!selectedAssignment) return;

    if (selectedAssignment.departmentId) {
      setDepartmentId(selectedAssignment.departmentId);
    }
    setRole(selectedAssignment.role);
  }

  async function handleCreateDepartment() {
    if (!onCreateDepartment || !newDepartmentName.trim()) return;

    setIsCreatingDepartment(true);
    try {
      await onCreateDepartment(newDepartmentName.trim());
      setNewDepartmentName("");
      setShowDepartmentCreate(false);
    } finally {
      setIsCreatingDepartment(false);
    }
  }

  function toggleCollaborator(userId: string) {
    setCollaboratorIds(
      collaboratorIds.includes(userId)
        ? collaboratorIds.filter((id) => id !== userId)
        : [...collaboratorIds, userId],
    );
  }

  return (
    <div
      className="fixed z-50 flex items-start justify-center bg-gray-100/80 pt-20 motion-fade-in"
      style={{
        top: 0,
        left: "var(--sidebar-width, 16rem)",
        right: 0,
        bottom: 0,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="motion-panel-in bg-[var(--card-bg)] rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto shadow-lg border border-[var(--border)] chat-scroll"
      >
        <div className="flex items-start justify-between mb-6">
          <h2 id={dialogTitleId} className="text-lg font-semibold">
            {editTaskData ? "Edit Task" : "Create New Task"}
          </h2>
          <p id={dialogDescriptionId} className="sr-only">
            Complete the task details, assignment, schedule, status, and progress fields.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="motion-interactive rounded p-2 text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)]"
            aria-label="Close task modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={`${fieldIdPrefix}-task-title`} className="block text-sm mb-1 font-medium">
                Task Name <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldIdPrefix}-task-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to be done?"
                className={fieldControlClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}-description`} className="block text-sm mb-1 font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`${fieldIdPrefix}-description`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell us more about this task..."
              className={`${fieldControlClass} min-h-24`}
              required
            />
          </div>

          {canManageAssignments ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label htmlFor={`${fieldIdPrefix}-department`} className="block text-sm font-medium">
                      Department <span className="text-red-500">*</span>
                    </label>
                    {onCreateDepartment ? (
                      <button
                        type="button"
                        onClick={() => setShowDepartmentCreate((current) => !current)}
                        className="text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        New department
                      </button>
                    ) : null}
                  </div>
                  <select
                    id={`${fieldIdPrefix}-department`}
                    value={departmentId}
                    onChange={(event) => {
                      setDepartmentId(event.target.value);
                      setRole("");
                    }}
                    className={selectControlClass}
                    required
                    aria-label="Department"
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {showDepartmentCreate ? (
                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <input
                        value={newDepartmentName}
                        onChange={(event) => setNewDepartmentName(event.target.value)}
                        placeholder="Department name"
                        className={fieldControlClass}
                        aria-label="New department name"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={isCreatingDepartment}
                        disabled={!newDepartmentName.trim() || isCreatingDepartment}
                        onClick={() => void handleCreateDepartment()}
                      >
                        Add
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${fieldIdPrefix}-priority`} className="block text-sm mb-1 font-medium">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`${fieldIdPrefix}-priority`}
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as TaskPriority)}
                    className={selectControlClass}
                    aria-label="Priority"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Med">Med</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`${fieldIdPrefix}-assignee`} className="block text-sm mb-1 font-medium">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    {onAssignToCurrentUser && (
                      <button
                        type="button"
                        onClick={onAssignToCurrentUser}
                        className="text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                  <select
                    id={`${fieldIdPrefix}-assignee`}
                    value={assigneeId}
                    onChange={(event) => handleAssigneeChange(event.target.value)}
                    className={selectControlClass}
                    aria-label="Assign To"
                    required
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
              </div>

              <div>
                <div id={`${fieldIdPrefix}-collaborators-label`} className="block text-sm mb-1 font-medium">
                  Collaborators
                </div>
                <div
                  role="group"
                  aria-labelledby={`${fieldIdPrefix}-collaborators-label`}
                  className="max-h-36 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--card-surface)] p-2 chat-scroll"
                >
                  {users.filter((user) => String(user.id) !== String(assigneeId)).length === 0 ? (
                    <div className="px-2 py-3 text-sm text-[var(--muted)]">No other members available.</div>
                  ) : (
                    users
                      .filter((user) => String(user.id) !== String(assigneeId))
                      .map((user) => {
                        const userId = String(user.id);
                        return (
                          <label
                            key={userId}
                            className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--card-bg)]"
                          >
                            <input
                              type="checkbox"
                              checked={collaboratorIds.includes(userId)}
                              onChange={() => toggleCollaborator(userId)}
                              className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                            />
                            <span className="min-w-0 flex-1 truncate">{user.name || user.email}</span>
                            {user.role ? <span className="text-xs text-[var(--muted)]">{user.role}</span> : null}
                          </label>
                        );
                      })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <div className="rounded border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="text-xs font-semibold uppercase text-[var(--muted)]">Assignment</div>
                <div className="mt-1 text-sm font-medium">{assignmentSummary?.assigneeName || "You"}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {assignmentSummary?.departmentName || "Department not set"}
                </div>
                {!assignmentSummary?.isReady && (
                  <p className="mt-2 text-xs text-red-500">
                    Ask an admin to complete your task assignment before creating tasks.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`${fieldIdPrefix}-readonly-priority`} className="block text-sm mb-1 font-medium">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  id={`${fieldIdPrefix}-readonly-priority`}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  className={selectControlClass}
                  aria-label="Priority"
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Med">Med</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor={`${fieldIdPrefix}-project`} className="block text-sm mb-1 font-medium">
              Project
            </label>
            <select
              id={`${fieldIdPrefix}-project`}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={selectControlClass}
              aria-label="Project"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}{project.status === "completed" ? " (completed)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <SegmentedDateInput
                id={`${fieldIdPrefix}-start-date`}
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-10 shrink-0 px-4"
                onClick={() => setStartDate(todayDate)}
              >
                Today
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <SegmentedDateInput
                id={`${fieldIdPrefix}-due-date`}
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-10 shrink-0 px-4"
                onClick={() => setDueDate(todayDate)}
              >
                Today
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={`${fieldIdPrefix}-status`} className="block text-sm mb-1 font-medium">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id={`${fieldIdPrefix}-status`}
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className={selectControlClass}
                aria-label="Status"
                required
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${fieldIdPrefix}-estimated-time`} className="block text-sm mb-1 font-medium">
                ETOC <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldIdPrefix}-estimated-time`}
                name="estimatedTime"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={estimatedTime}
                onChange={(event) => setEstimatedTime(event.target.value)}
                onBlur={normalizeEstimatedTime}
                placeholder="HH:MM"
                pattern="\d{1,3}:[0-5]\d"
                title="Use HH:MM, for example 01:30"
                aria-describedby={`${fieldIdPrefix}-estimated-time-help`}
                className={fieldControlClass}
                required
              />
              <p id={`${fieldIdPrefix}-estimated-time-help`} className="mt-1 text-xs text-[var(--muted)]">
                Use HH:MM, for example 01:30.
              </p>
            </div>
          </div>

          {editTaskData && (
            <div>
              <div className="block text-sm mb-1 font-medium">Progress - {progress}%</div>
              <div
                className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden"
                role="progressbar"
                aria-label="Task progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="bg-[var(--accent)] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Auto-calculated from time elapsed vs. estimated time
              </p>
            </div>
          )}

          {editTaskData && (
            <div>
              <label htmlFor={`${fieldIdPrefix}-progress-notes`} className="block text-sm mb-1 font-medium">Add Progress Note</label>
              <textarea
                id={`${fieldIdPrefix}-progress-notes`}
                value={progressNotes}
                onChange={(event) => setProgressNotes(event.target.value)}
                placeholder="Add a note about recent progress..."
                className={`${fieldControlClass} h-20`}
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
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete Task
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
