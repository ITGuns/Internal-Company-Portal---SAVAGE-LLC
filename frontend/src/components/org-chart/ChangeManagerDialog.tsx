"use client";

import React, { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import {
  getManagerCandidates,
  getMemberDisplayName,
  type OrgChartMember,
} from '@/lib/org-chart';

interface ChangeManagerDialogProps {
  member: OrgChartMember;
  members: OrgChartMember[];
  canSetRoot: boolean;
  onClose: () => void;
  onSave: (memberId: string, managerId: string | null) => Promise<void>;
}

const selectClass =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

/** Pick who a member reports to. The server refuses cycles and checks rights again. */
export default function ChangeManagerDialog({ member, members, canSetRoot, onClose, onSave }: ChangeManagerDialogProps) {
  const candidates = useMemo(() => getManagerCandidates(member.id, members), [member.id, members]);
  const currentManagerId = candidates.some((candidate) => candidate.id === member.managerId) ? member.managerId! : '';
  const [managerId, setManagerId] = useState(currentManagerId);
  const [saving, setSaving] = useState<'manager' | 'root' | null>(null);
  const [error, setError] = useState('');
  const name = getMemberDisplayName(member);
  const selectId = `manager-select-${member.id}`;

  async function save(nextManagerId: string | null, mode: 'manager' | 'root') {
    setError('');
    setSaving(mode);
    try {
      await onSave(member.id, nextManagerId);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not change the manager. Try again.');
    } finally {
      setSaving(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!managerId) {
      setError('Choose a manager.');
      return;
    }
    void save(managerId, 'manager');
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Change manager"
      subtitle={`Who does ${name} report to?`}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving !== null}>Cancel</Button>
          {canSetRoot ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void save(null, 'root')}
              loading={saving === 'root'}
              disabled={saving !== null || !member.managerId}
              title={member.managerId ? undefined : 'Already at the top of the chart'}
            >
              Set as root
            </Button>
          ) : null}
          <Button type="submit" form="change-manager-form" loading={saving === 'manager'} disabled={saving !== null}>
            Save
          </Button>
        </>
      }
    >
      <form id="change-manager-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          Reports to <span className="text-[var(--status-blocked)]" aria-hidden="true">*</span>
        </label>
        <select
          id={selectId}
          name="managerId"
          className={selectClass}
          value={managerId}
          onChange={(event) => setManagerId(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${selectId}-help${error ? ` ${selectId}-error` : ''}`}
          required
        >
          <option value="">Choose a member</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {getMemberDisplayName(candidate)}, {candidate.roleLabel}
            </option>
          ))}
        </select>
        <p id={`${selectId}-help`} className="mt-1.5 text-xs text-[var(--muted)]">
          {name} and the people who report to them are not listed, so the chart cannot loop.
          {canSetRoot ? ' Set as root removes the manager and puts them at the top of their department.' : ''}
        </p>
        {error ? (
          <p id={`${selectId}-error`} role="alert" className="mt-2 text-sm text-[var(--status-blocked)]">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
