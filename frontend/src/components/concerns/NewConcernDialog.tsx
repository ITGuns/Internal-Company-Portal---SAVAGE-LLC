"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { useToast } from '@/components/ToastProvider';
import {
  ORG_CHART_QUERY_KEY,
  fetchOrgChart,
  getConcernRecipients,
  getMemberDisplayName,
} from '@/lib/org-chart';
import {
  BODY_MAX_LENGTH,
  CONCERNS_QUERY_KEY,
  SUBJECT_MAX_LENGTH,
  createConcern,
  hasDraftErrors,
  validateConcernDraft,
  type ConcernDraftErrors,
} from '@/lib/concerns';

interface NewConcernDialogProps {
  /** Supervisor picked on the org chart; the field stays editable. */
  initialAssigneeId?: string;
  onClose: () => void;
}

const fieldClass =
  'w-full rounded-[var(--radius-md)] border bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60';

function borderFor(error?: string) {
  return error ? 'border-[var(--status-blocked)]' : 'border-[var(--border)]';
}

/** New concern: to a supervisor (any member for full access), with a subject and details. */
export default function NewConcernDialog({ initialAssigneeId = '', onClose }: NewConcernDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const orgChart = useQuery({ queryKey: ORG_CHART_QUERY_KEY, queryFn: fetchOrgChart });
  const recipients = useMemo(
    () => (orgChart.data ? getConcernRecipients(orgChart.data.members, orgChart.data.viewer) : []),
    [orgChart.data],
  );
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState('');

  const errors: ConcernDraftErrors = submitted ? validateConcernDraft({ assigneeId, subject, body }) : {};
  const noRecipients = orgChart.isSuccess && recipients.length === 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (hasDraftErrors(validateConcernDraft({ assigneeId, subject, body }))) return;

    setSending(true);
    try {
      const concern = await createConcern({ assigneeId, subject: subject.trim(), body: body.trim() });
      await queryClient.invalidateQueries({ queryKey: CONCERNS_QUERY_KEY });
      toast.success(`Concern #${concern.number} sent`, `${getMemberDisplayName(concern.assignee)} will see it in their inbox.`);
      onClose();
      router.push(`/concerns/${concern.id}`);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not send the concern. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New concern"
      subtitle="Ask a supervisor a question or raise a concern. Only the two of you and admins can read the conversation."
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button type="submit" form="new-concern-form" loading={sending} disabled={noRecipients}>Send concern</Button>
        </>
      }
    >
      <form id="new-concern-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="concern-assignee" className="mb-1.5 block text-sm font-medium">
            To <span className="text-[var(--status-blocked)]" aria-hidden="true">*</span>
          </label>
          <select
            id="concern-assignee"
            name="assigneeId"
            className={`${fieldClass} ${borderFor(errors.assigneeId)}`}
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={!orgChart.isSuccess || noRecipients}
            aria-invalid={Boolean(errors.assigneeId) || undefined}
            aria-describedby={errors.assigneeId ? 'concern-assignee-error' : 'concern-assignee-help'}
            required
          >
            <option value="">{orgChart.isLoading ? 'Loading people...' : 'Choose a supervisor'}</option>
            {recipients.map((person) => (
              <option key={person.id} value={person.id}>
                {getMemberDisplayName(person)}, {person.roleLabel}
              </option>
            ))}
          </select>
          {errors.assigneeId ? (
            <p id="concern-assignee-error" className="mt-1.5 text-xs text-[var(--status-blocked)]">{errors.assigneeId}</p>
          ) : (
            <p id="concern-assignee-help" className="mt-1.5 text-xs text-[var(--muted)]">
              {orgChart.isError
                ? 'Could not load the list of supervisors. Close this and try again.'
                : noRecipients
                  ? 'Nobody can receive concerns yet. Ask an admin to set reporting lines on the org chart.'
                  : 'Supervisors are people with direct reports or a management role.'}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="concern-subject" className="mb-1.5 block text-sm font-medium">
            Subject <span className="text-[var(--status-blocked)]" aria-hidden="true">*</span>
          </label>
          <input
            id="concern-subject"
            name="subject"
            className={`${fieldClass} ${borderFor(errors.subject)}`}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={SUBJECT_MAX_LENGTH}
            autoComplete="off"
            placeholder="For example: Overtime on 14 October"
            aria-invalid={Boolean(errors.subject) || undefined}
            aria-describedby="concern-subject-note"
            required
          />
          <p id="concern-subject-note" className={`mt-1.5 flex justify-between gap-3 text-xs ${errors.subject ? 'text-[var(--status-blocked)]' : 'text-[var(--muted)]'}`}>
            <span>{errors.subject || 'A short summary, 3 to 120 characters.'}</span>
            <span className="tabular-nums">{subject.trim().length}/{SUBJECT_MAX_LENGTH}</span>
          </p>
        </div>

        <div>
          <label htmlFor="concern-body" className="mb-1.5 block text-sm font-medium">
            Details <span className="text-[var(--status-blocked)]" aria-hidden="true">*</span>
          </label>
          <textarea
            id="concern-body"
            name="body"
            rows={6}
            className={`${fieldClass} ${borderFor(errors.body)} resize-y`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={BODY_MAX_LENGTH}
            placeholder="What happened, and what do you need from them?"
            aria-invalid={Boolean(errors.body) || undefined}
            aria-describedby="concern-body-note"
            required
          />
          <p id="concern-body-note" className={`mt-1.5 flex justify-between gap-3 text-xs ${errors.body ? 'text-[var(--status-blocked)]' : 'text-[var(--muted)]'}`}>
            <span>{errors.body || 'They get a notification with a link to this concern.'}</span>
            <span className="tabular-nums">{body.trim().length}/{BODY_MAX_LENGTH}</span>
          </p>
        </div>

        {serverError ? (
          <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] px-3 py-2 text-sm text-[var(--status-blocked)]">
            {serverError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
