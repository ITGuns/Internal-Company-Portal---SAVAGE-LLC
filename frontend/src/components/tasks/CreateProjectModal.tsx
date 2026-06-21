"use client";

import React from "react";
import { Plus } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import Modal from "@/components/Modal";
import type { TaskUser } from "@/lib/tasks";

interface CreateProjectModalProps {
  isOpen: boolean;
  projectName: string;
  projectDescription: string;
  projectTargetDate: string;
  projectMemberIds: string[];
  users: TaskUser[];
  isSubmitting: boolean;
  onProjectNameChange: (value: string) => void;
  onProjectDescriptionChange: (value: string) => void;
  onProjectTargetDateChange: (value: string) => void;
  onProjectMemberIdsChange: (value: string[]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateProjectModal({
  isOpen,
  projectName,
  projectDescription,
  projectTargetDate,
  projectMemberIds,
  users,
  isSubmitting,
  onProjectNameChange,
  onProjectDescriptionChange,
  onProjectTargetDateChange,
  onProjectMemberIdsChange,
  onSubmit,
  onClose,
}: CreateProjectModalProps) {
  const selectedMemberSet = React.useMemo(
    () => new Set(projectMemberIds.map(String)),
    [projectMemberIds],
  );
  const activeUsers = React.useMemo(
    () => users.filter((user) => user.email),
    [users],
  );

  function toggleMember(userId: string) {
    if (selectedMemberSet.has(userId)) {
      onProjectMemberIdsChange(projectMemberIds.filter((id) => id !== userId));
      return;
    }

    onProjectMemberIdsChange([...projectMemberIds, userId]);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Project"
      subtitle="Create a project group for tasks, ownership, and delivery tracking."
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField
          id="task-project-name"
          name="projectName"
          label="Project Name"
          value={projectName}
          onChange={onProjectNameChange}
          placeholder="e.g. Website Launch"
          required
          autoComplete="off"
          helperText="Use a short name employees can recognize in task filters."
        />

        <div>
          <label
            htmlFor="task-project-description"
            className="mb-2 block text-sm font-medium text-[var(--foreground)]"
          >
            Short Description
          </label>
          <textarea
            id="task-project-description"
            name="projectDescription"
            value={projectDescription}
            onChange={(event) => onProjectDescriptionChange(event.target.value)}
            placeholder="Describe the goal or scope"
            autoComplete="off"
            rows={3}
            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-sm text-[var(--muted)]">
            Optional. This appears as project context on task cards.
          </p>
        </div>

        <div className="grid gap-4">
          <FormField
            id="task-project-target-date"
            name="projectTargetDate"
            label="Target Date"
            type="date"
            value={projectTargetDate}
            onChange={onProjectTargetDateChange}
            autoComplete="off"
            labelAction={
              <button
                type="button"
                onClick={() => onProjectTargetDateChange(getTodayDateValue())}
                className="rounded text-xs font-semibold text-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Today
              </button>
            }
            helperText="Optional target date for project reporting."
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div id="task-project-members-label" className="text-sm font-medium text-[var(--foreground)]">
                Members
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Add employees who should see and help work inside this project.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <span className="rounded border border-[var(--border)] px-2 py-1 text-[var(--muted)]">
                {projectMemberIds.length} selected
              </span>
              {activeUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => onProjectMemberIdsChange(activeUsers.map((user) => String(user.id)))}
                  className="rounded text-xs font-semibold text-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Select all
                </button>
              )}
              {projectMemberIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onProjectMemberIdsChange([])}
                  className="rounded text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div
            role="group"
            aria-labelledby="task-project-members-label"
            className="max-h-48 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--card-surface)] p-2 chat-scroll"
          >
            {activeUsers.length === 0 ? (
              <div className="px-2 py-3 text-sm text-[var(--muted)]">No employees available.</div>
            ) : (
              activeUsers.map((user) => {
                const userId = String(user.id);
                const roleLabel = user.role || user.roles?.[0]?.role || null;

                return (
                  <label
                    key={userId}
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--card-bg)]"
                  >
                    <input
                      type="checkbox"
                      name="projectMemberIds"
                      value={userId}
                      checked={selectedMemberSet.has(userId)}
                      onChange={() => toggleMember(userId)}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[var(--foreground)]">{user.name || user.email}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{user.email}</span>
                    </span>
                    {roleLabel ? <span className="max-w-32 truncate text-xs text-[var(--muted)]">{roleLabel}</span> : null}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
