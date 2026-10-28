"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import {
  ORG_CHART_QUERY_KEY,
  fetchOrgChart,
  getConcernRecipients,
  getMemberDisplayName,
} from '@/lib/org-chart';
import type { ConcernDetail } from '@/lib/concerns';

interface ReassignDialogProps {
  concern: ConcernDetail;
  onClose: () => void;
  onReassign: (assigneeId: string) => Promise<void>;
}

/** Hand a concern to another supervisor. Never to the person who raised it. */
export default function ReassignDialog({ concern, onClose, onReassign }: ReassignDialogProps) {
  const orgChart = useQuery({ queryKey: ORG_CHART_QUERY_KEY, queryFn: fetchOrgChart });
  const options = useMemo(
    () => (orgChart.data
      ? getConcernRecipients(orgChart.data.members, orgChart.data.viewer, [concern.requester.id, concern.assignee.id], false)
      : []),
    [concern.assignee.id, concern.requester.id, orgChart.data],
  );
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!assigneeId) {
      setError('Choose a supervisor.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onReassign(assigneeId);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not reassign. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Reassign concern #${concern.number}`}
      subtitle="The new supervisor and the person who raised it both get a notification."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="reassign-concern-form" loading={saving} disabled={orgChart.isSuccess && options.length === 0}>
            Reassign
          </Button>
        </>
      }
    >
      <form id="reassign-concern-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="reassign-assignee" className="mb-1.5 block text-sm font-medium">
          New supervisor <span className="text-[var(--status-blocked)]" aria-hidden="true">*</span>
        </label>
        <select
          id="reassign-assignee"
          name="assigneeId"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          disabled={!orgChart.isSuccess || options.length === 0}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? 'reassign-error' : 'reassign-help'}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
          required
        >
          <option value="">{orgChart.isLoading ? 'Loading people...' : 'Choose a supervisor'}</option>
          {options.map((person) => (
            <option key={person.id} value={person.id}>
              {getMemberDisplayName(person)}, {person.roleLabel}
            </option>
          ))}
        </select>
        {error ? (
          <p id="reassign-error" role="alert" className="mt-2 text-sm text-[var(--status-blocked)]">{error}</p>
        ) : (
          <p id="reassign-help" className="mt-1.5 text-xs text-[var(--muted)]">
            {orgChart.isError
              ? 'Could not load the list of supervisors. Close this and try again.'
              : orgChart.isSuccess && options.length === 0
                ? 'There is no other supervisor to hand this to.'
                : 'Only supervisors are listed: people with direct reports or a management role.'}
          </p>
        )}
      </form>
    </Modal>
  );
}
