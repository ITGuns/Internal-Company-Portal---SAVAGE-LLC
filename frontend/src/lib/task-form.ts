import { parseEstimatedClockToMinutes } from './task-estimate';

export type TaskFormField = 'title' | 'description' | 'assignee' | 'estimatedTime';
export type TaskFormErrors = Partial<Record<TaskFormField, string>>;

export interface TaskFormValues {
  title: string;
  description: string;
  assigneeId: string | number;
  estimatedTime: string;
  /** Only people who manage assignments pick an assignee; everyone else creates tasks for themselves. */
  requireAssignee: boolean;
}

/** Required-field checks for the task form, keyed in form order so the first error matches the first field. */
export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  if (!values.title.trim()) errors.title = 'Enter a task name.';
  if (!values.description.trim()) errors.description = 'Add a short description of the work.';
  if (values.requireAssignee && !String(values.assigneeId ?? '').trim()) {
    errors.assignee = 'Choose who the task is assigned to.';
  }
  if (!parseEstimatedClockToMinutes(values.estimatedTime)) {
    errors.estimatedTime = 'Enter ETOC as HH:MM, for example 01:30.';
  }

  return errors;
}
