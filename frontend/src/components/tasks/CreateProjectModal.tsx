"use client";

import React from "react";
import { Plus } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import Modal from "@/components/Modal";

interface CreateProjectModalProps {
  isOpen: boolean;
  projectName: string;
  projectDescription: string;
  projectTargetDate: string;
  isSubmitting: boolean;
  onProjectNameChange: (value: string) => void;
  onProjectDescriptionChange: (value: string) => void;
  onProjectTargetDateChange: (value: string) => void;
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
  isSubmitting,
  onProjectNameChange,
  onProjectDescriptionChange,
  onProjectTargetDateChange,
  onSubmit,
  onClose,
}: CreateProjectModalProps) {
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
