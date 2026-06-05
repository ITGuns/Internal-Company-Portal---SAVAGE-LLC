"use client";

import React from "react";
import Button from "@/components/Button";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { Trash2, X } from "lucide-react";
import type { TaskPriority, TaskStatus, TaskDepartment, TaskUser, Task } from "@/lib/tasks";
import { getPrimaryTaskAssignmentFromRoles } from "@/lib/task-access";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const OTHER_ROLE_VALUE = "__manual_role__";
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
  progress: number;
  setProgress: (v: number) => void;
  progressNotes: string;
  setProgressNotes: (v: string) => void;
  departments: TaskDepartment[];
  users: TaskUser[];
  canManageAssignments: boolean;
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
  progress,
  progressNotes,
  setProgressNotes,
  departments,
  users,
  canManageAssignments,
  assignmentSummary,
  onAssignToCurrentUser,
  onSubmit,
  onDelete,
  onClose,
}: TaskModalProps) {
  const [isManualRoleMode, setIsManualRoleMode] = React.useState(false);
  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();
  const fieldIdPrefix = React.useId();
  const { dialogRef, handleDialogKeyDown } = useDialogA11y({ onClose });
  const selectedDepartment = departments.find(
    (department) => department.id?.toString() === departmentId?.toString(),
  );
  const availableRoles = selectedDepartment?.availableRoles?.map((availableRole) => availableRole.name) || [];
  const showManualRoleInput = isManualRoleMode || Boolean(role && selectedDepartment && !availableRoles.includes(role));

  function handleAssigneeChange(nextAssigneeId: string) {
    setAssigneeId(nextAssigneeId);

    const selectedUser = users.find((user) => String(user.id) === String(nextAssigneeId));
    const selectedAssignment = getPrimaryTaskAssignmentFromRoles(selectedUser?.roles);
    if (!selectedAssignment) return;

    if (selectedAssignment.departmentId) {
      setDepartmentId(selectedAssignment.departmentId);
    }
    setRole(selectedAssignment.role);
    setIsManualRoleMode(false);
  }

  function handleRoleSelect(nextRole: string) {
    if (nextRole === OTHER_ROLE_VALUE) {
      setIsManualRoleMode(true);
      setRole("");
      return;
    }

    setIsManualRoleMode(false);
    setRole(nextRole);
  }

  function clearManualRole() {
    setIsManualRoleMode(false);
    setRole("");
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
                  <label htmlFor={`${fieldIdPrefix}-department`} className="block text-sm mb-1 font-medium">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`${fieldIdPrefix}-department`}
                    value={departmentId}
                    onChange={(event) => {
                      setDepartmentId(event.target.value);
                      setRole("");
                      setIsManualRoleMode(false);
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <label htmlFor={`${fieldIdPrefix}-role`} className="block text-sm mb-1 font-medium">
                    Role <span className="text-red-500">*</span>
                  </label>
                  {showManualRoleInput ? (
                    <div className="flex gap-2">
                      <input
                        id={`${fieldIdPrefix}-role`}
                        type="text"
                        value={role}
                        onChange={(event) => {
                          setIsManualRoleMode(true);
                          setRole(event.target.value);
                        }}
                        placeholder="Type a role..."
                        className={fieldControlClass}
                        autoFocus
                        required
                        aria-label="Manual role"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearManualRole}
                        className="px-3"
                        aria-label="Return to role dropdown"
                        title="Return to role dropdown"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <select
                      id={`${fieldIdPrefix}-role`}
                      value={role}
                      onChange={(event) => handleRoleSelect(event.target.value)}
                      disabled={!departmentId}
                      className={selectControlClass}
                      aria-label="Role"
                      required
                    >
                      <option value="">Select role</option>
                      {availableRoles.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                      <option value={OTHER_ROLE_VALUE}>Other / type a role</option>
                    </select>
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
                  {assignmentSummary?.departmentName || "Department not set"} / {assignmentSummary?.role || "Role not set"}
                </div>
                {!assignmentSummary?.isReady && (
                  <p className="mt-2 text-xs text-red-500">
                    Ask an admin to assign your department and role before creating tasks.
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={`${fieldIdPrefix}-start-date`} className="block text-sm mb-1 font-medium">Start Date</label>
              <input
                id={`${fieldIdPrefix}-start-date`}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={fieldControlClass}
                aria-label="Start Date"
              />
            </div>

            <div>
              <label htmlFor={`${fieldIdPrefix}-due-date`} className="block text-sm mb-1 font-medium">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldIdPrefix}-due-date`}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={fieldControlClass}
                aria-label="Due Date"
                required
              />
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
                ETOC (Est. Minutes) <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldIdPrefix}-estimated-time`}
                type="number"
                value={estimatedTime}
                onChange={(event) => setEstimatedTime(event.target.value)}
                placeholder="e.g. 60"
                className={fieldControlClass}
                required
              />
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
