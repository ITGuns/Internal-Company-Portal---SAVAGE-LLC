"use client";

/**
 * Admin sets a new password for a member (POST /users/:id/reset-password).
 * Offered wherever Deactivate is offered. Production has no email, so this is
 * how a member who forgot their password gets back in.
 */

import React, { useId, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { generatePassword, validateResetPasswordForm } from "@/lib/password-reset";
import { resetUserPassword } from "@/lib/users-admin";
import type { MemberStatusTarget } from "./MemberStatusModal";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

interface ResetPasswordModalProps {
  member: MemberStatusTarget;
  onClose: () => void;
}

// Plain text on purpose: the admin has to read the password out or send it, and a
// password field would make the browser offer to save it as the admin's own.
const passwordInputProps = {
  type: "text",
  autoComplete: "off",
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const;

export default function ResetPasswordModal({ member, onClose }: ResetPasswordModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [changed, setChanged] = useState(false);

  const errors = validateResetPasswordForm({ password, confirm }, member.email);
  const passwordError = attempted ? errors.password : undefined;
  const confirmError = attempted ? errors.confirm : undefined;
  const passwordHelpId = `${idPrefix}-password-help`;
  const confirmErrorId = `${idPrefix}-confirm-error`;

  function editPassword(nextPassword: string, nextConfirm: string) {
    setPassword(nextPassword);
    setConfirm(nextConfirm);
    setCopied(false);
    setApiError(null);
  }

  function handleGenerate() {
    try {
      const generated = generatePassword();
      editPassword(generated, generated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a password. Type one instead.");
    }
  }

  async function handleCopy() {
    if (!navigator.clipboard) {
      toast.warning("Clipboard is unavailable. Select the password and copy it yourself.");
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      toast.warning("Could not copy. Select the password and copy it yourself.");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (errors.password || errors.confirm) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await resetUserPassword(member.id, password);
      setChanged(true);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : `Could not reset the password for ${member.name}.`);
    } finally {
      setSubmitting(false);
    }
  }

  const copyButton = (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      disabled={!password || submitting}
      icon={<Copy className="h-4 w-4" aria-hidden="true" />}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Reset password"
      subtitle={member.email ? `${member.name}, ${member.email}` : member.name}
      size="md"
    >
      {changed ? (
        <div className="grid gap-4">
          <p role="status" className="text-sm text-[var(--foreground)]">
            Password changed. {member.name} was signed out on all their devices.
          </p>
          <div>
            <label htmlFor={`${idPrefix}-new`} className={fieldLabelClass}>New password</label>
            <div className="flex gap-2">
              <input
                id={`${idPrefix}-new`}
                {...passwordInputProps}
                readOnly
                value={password}
                onFocus={(event) => event.currentTarget.select()}
                className={`${fieldInputClass} min-w-0 flex-1 font-mono`}
              />
              {copyButton}
            </div>
            <p className={fieldHelpClass}>Tell them in person or by chat.</p>
          </div>
          <div className="flex justify-end border-t border-[var(--border)] pt-4">
            <Button type="button" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <p className="text-sm text-[var(--muted)]">
            The new password replaces the current one and signs {member.name} out on all their devices.
          </p>
          <div>
            <label htmlFor={`${idPrefix}-password`} className={fieldLabelClass}>New password</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`${idPrefix}-password`}
                {...passwordInputProps}
                value={password}
                onChange={(event) => editPassword(event.target.value, confirm)}
                disabled={submitting}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordHelpId}
                className={`${fieldInputClass} min-w-0 flex-1 font-mono`}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={submitting}
                  icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                >
                  Generate
                </Button>
                {copyButton}
              </div>
            </div>
            <p id={passwordHelpId} className={passwordError ? fieldErrorClass : fieldHelpClass}>
              {passwordError ?? "8 to 72 characters, with an uppercase letter and a number."}
            </p>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-confirm`} className={fieldLabelClass}>Confirm new password</label>
            <input
              id={`${idPrefix}-confirm`}
              {...passwordInputProps}
              value={confirm}
              onChange={(event) => editPassword(password, event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(confirmError)}
              aria-describedby={confirmError ? confirmErrorId : undefined}
              className={`${fieldInputClass} font-mono`}
            />
            {confirmError && <p id={confirmErrorId} className={fieldErrorClass}>{confirmError}</p>}
          </div>
          {apiError && <p role="alert" className={fieldErrorClass}>{apiError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>Reset password</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
