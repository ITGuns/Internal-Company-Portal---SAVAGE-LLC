"use client";

/**
 * Confirmation dialog for deactivate, reactivate and admin-only hard delete
 * (docs/payroll-time-v2-spec.md rule 6).
 */

import React, { useEffect, useId, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { deactivateUser, hardDeleteUser, reactivateUser } from "@/lib/users-admin";
import { getHardDeleteConfirmationPhrase, isHardDeleteConfirmed } from "@/lib/member-status";
import { fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

export type MemberStatusAction = "deactivate" | "reactivate" | "hard_delete";

export interface MemberStatusTarget {
  id: string;
  name: string;
  email?: string | null;
}

interface MemberStatusModalProps {
  action: MemberStatusAction | null;
  member: MemberStatusTarget | null;
  onClose: () => void;
  onDone: (action: MemberStatusAction, member: MemberStatusTarget) => void;
}

const COPY: Record<MemberStatusAction, { title: string; body: string; confirm: string; success: string }> = {
  deactivate: {
    title: "Deactivate member",
    body: "They will be signed out and cannot sign in until reactivated. Their time entries and payslips stay on record.",
    confirm: "Deactivate",
    success: "deactivated",
  },
  reactivate: {
    title: "Reactivate member",
    body: "They can sign in again with their existing account and roles.",
    confirm: "Reactivate",
    success: "reactivated",
  },
  hard_delete: {
    title: "Delete permanently",
    body: "This removes the account and its records for good. It is refused while the member has any payslip. Deactivate instead if you only need to block access.",
    confirm: "Delete permanently",
    success: "deleted",
  },
};

export default function MemberStatusModal({ action, member, onClose, onDone }: MemberStatusModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTyped("");
  }, [action, member?.id]);

  if (!action || !member) return null;

  const copy = COPY[action];
  const phrase = getHardDeleteConfirmationPhrase(member.email);
  const needsTyping = action === "hard_delete";
  const confirmed = !needsTyping || isHardDeleteConfirmed(typed, member.email);

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!action || !member || !confirmed) return;
    setSubmitting(true);
    try {
      if (action === "deactivate") await deactivateUser(member.id);
      else if (action === "reactivate") await reactivateUser(member.id);
      else await hardDeleteUser(member.id);
      toast.success(`${member.name} was ${copy.success}.`);
      onDone(action, member);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not finish this action for ${member.name}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={copy.title} subtitle={member.email ? `${member.name}, ${member.email}` : member.name} size="md">
      <form onSubmit={handleConfirm} className="grid gap-4" noValidate>
        <p className="text-sm text-[var(--muted)]">{copy.body}</p>
        {needsTyping && (
          <div>
            <label htmlFor={`${idPrefix}-confirm`} className={fieldLabelClass}>
              Type <span className="font-mono">{phrase}</span> to confirm
            </label>
            <input
              id={`${idPrefix}-confirm`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              className={`${fieldInputClass} font-mono`}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={submitting}
              aria-describedby={`${idPrefix}-confirm-help`}
            />
            <p id={`${idPrefix}-confirm-help`} className={fieldHelpClass}>This cannot be undone.</p>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            type="submit"
            variant={action === "reactivate" ? "primary" : "danger"}
            loading={submitting}
            disabled={!confirmed}
          >
            {copy.confirm}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
