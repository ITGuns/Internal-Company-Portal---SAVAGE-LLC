"use client";

/**
 * Admin invite flow for the payroll Employee overview. Reuses the onboarding
 * invitation API (POST /users/onboarding-invitations), which returns a setup link.
 */

import React, { useEffect, useId, useState } from "react";
import { CheckCircle2, Copy, LinkIcon } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { fetchRoles } from "@/lib/api";
import {
  canSubmitOnboardingInvite,
  createUserOnboardingInvitation,
  getOnboardingRoleLabel,
  normalizeOnboardingEmail,
  type AdminOnboardingResult,
  type AdminOnboardingRole,
} from "@/lib/admin-onboarding";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => void;
}

export default function InviteEmployeeModal({ isOpen, onClose, onInvited }: InviteEmployeeModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [roles, setRoles] = useState<AdminOnboardingRole[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AdminOnboardingResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setRoleId("");
    setResult(null);
    setCopied(false);

    let mounted = true;
    setLoadingRoles(true);
    setRolesError(null);
    fetchRoles()
      .then((loaded) => {
        if (mounted) setRoles(Array.isArray(loaded) ? loaded : []);
      })
      .catch((error) => {
        if (mounted) setRolesError(error instanceof Error ? error.message : "Could not load roles.");
      })
      .finally(() => {
        if (mounted) setLoadingRoles(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const canSubmit = canSubmitOnboardingInvite({ email, roleId }) && !saving && !loadingRoles;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setResult(null);
    const invitation = await createUserOnboardingInvitation({
      email: normalizeOnboardingEmail(email),
      roleId,
    });
    const checked = invitation.error || invitation.onboarding?.setupUrl
      ? invitation
      : { ...invitation, error: "The server did not return a setup link. Try again." };
    setResult(checked);
    setSaving(false);
    if (checked.error) {
      toast.error(checked.error);
    } else {
      toast.success("Setup link created.");
      onInvited?.();
    }
  }

  async function copyLink() {
    const url = result?.onboarding?.setupUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      toast.warning("Copy is not available here. Select the link and copy it by hand.");
    }
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const setupUrl = result?.onboarding?.setupUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add employee"
      subtitle="Create a setup link. The new employee sets a password, then signs in with the role you pick."
      size="md"
    >
      {setupUrl ? (
        <div className="grid gap-4">
          <div role="status" className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Link ready for {result?.user?.email}
            </div>
            {result?.onboarding?.role && (
              <p className="mt-1 text-[var(--muted)]">Role: {getOnboardingRoleLabel(result.onboarding.role)}</p>
            )}
          </div>
          <div>
            <label htmlFor={fieldId("link")} className={fieldLabelClass}>Setup link</label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                id={fieldId("link")}
                className={fieldInputClass}
                readOnly
                value={setupUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="secondary" icon={<Copy className="h-4 w-4" aria-hidden="true" />} onClick={() => void copyLink()}>
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <p className={fieldHelpClass}>
              Nothing is sent by email. Share the link with the employee yourself.
              {result?.onboarding?.expiresAt ? ` It expires ${new Date(result.onboarding.expiresAt).toLocaleString()}.` : ""}
            </p>
          </div>
          <div className="flex justify-end border-t border-[var(--border)] pt-4">
            <Button type="button" variant="primary" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div>
            <label htmlFor={fieldId("email")} className={fieldLabelClass}>Work email</label>
            <input
              id={fieldId("email")}
              type="email"
              autoComplete="off"
              className={fieldInputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div>
            <label htmlFor={fieldId("role")} className={fieldLabelClass}>Role</label>
            <select
              id={fieldId("role")}
              className={fieldInputClass}
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              disabled={saving || loadingRoles || roles.length === 0}
              aria-describedby={rolesError ? fieldId("role-error") : undefined}
              required
            >
              <option value="">
                {loadingRoles ? "Loading roles" : roles.length === 0 ? "No roles available" : "Select a role"}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{getOnboardingRoleLabel(role)}</option>
              ))}
            </select>
            {rolesError && <p id={fieldId("role-error")} className={fieldErrorClass}>{rolesError}</p>}
            {!rolesError && !loadingRoles && roles.length === 0 && (
              <p className={fieldHelpClass}>Create a role under Operations first.</p>
            )}
          </div>
          {result?.error && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm">
              {result.error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={!canSubmit}
              icon={<LinkIcon className="h-4 w-4" aria-hidden="true" />}
            >
              Create setup link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
