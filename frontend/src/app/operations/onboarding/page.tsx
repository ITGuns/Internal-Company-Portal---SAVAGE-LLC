"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Copy, LinkIcon, ShieldCheck, UserPlus } from "lucide-react";
import Button from "@/components/Button";
import Header from "@/components/Header";
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

const inputClass = "min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60";
const selectClass = `${inputClass} pr-8`;

export default function OperationsOnboardingPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<AdminOnboardingRole[]>([]);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AdminOnboardingResult | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy link");

  const canSubmit = canSubmitOnboardingInvite({ email, roleId }) && !saving && !loadingRoles;

  useEffect(() => {
    let mounted = true;

    async function loadRoles() {
      setLoadingRoles(true);
      try {
        const loadedRoles = await fetchRoles();
        if (!mounted) return;
        setRoles(Array.isArray(loadedRoles) ? loadedRoles : []);
      } catch (error) {
        if (!mounted) return;
        toast.error(error instanceof Error ? error.message : "Failed to load roles");
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    }

    void loadRoles();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    setCopyLabel("Copy link");
  }, [result?.onboarding.setupUrl]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setResult(null);
    try {
      const invitation = await createUserOnboardingInvitation({
        email: normalizeOnboardingEmail(email),
        roleId,
      });
      setResult(invitation);
      toast.success("Onboarding link generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate onboarding link");
    } finally {
      setSaving(false);
    }
  }

  async function copySetupLink() {
    if (!result?.onboarding.setupUrl) return;
    if (!navigator.clipboard) {
      toast.warning("Clipboard is unavailable. Select the link and copy it manually.");
      return;
    }

    await navigator.clipboard.writeText(result.onboarding.setupUrl);
    setCopyLabel("Copied");
    toast.success("Setup link copied");
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header
          title="Onboarding"
          subtitle="Generate approved account setup links for internal users."
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)]">
          <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-sm)]" aria-labelledby="onboarding-form-heading">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--card-surface)] text-[var(--accent)]">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="onboarding-form-heading" className="text-lg font-semibold">Create setup link</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Enter an email, choose a role, then copy the generated password setup link.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
              <div>
                <label htmlFor="onboarding-email" className="mb-2 block text-sm font-medium">Email</label>
                <input
                  id="onboarding-email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="newhire@example.com"
                  autoComplete="email"
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label htmlFor="onboarding-role" className="mb-2 block text-sm font-medium">Role</label>
                <select
                  id="onboarding-role"
                  className={selectClass}
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                  disabled={saving || loadingRoles || roles.length === 0}
                  required
                >
                  <option value="">
                    {loadingRoles ? "Loading roles..." : roles.length === 0 ? "No roles available" : "Select a role"}
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {getOnboardingRoleLabel(role)}
                    </option>
                  ))}
                </select>

              </div>

              {roles.length === 0 && !loadingRoles ? (
                <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-[var(--muted)]">
                  No roles are available yet. Create roles first, then return here to generate onboarding links.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  loading={saving}
                  disabled={!canSubmit}
                  icon={<LinkIcon className="h-4 w-4" />}
                >
                  Generate Link
                </Button>
                <Link
                  href="/operations"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Manage Roles
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </form>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-5" aria-labelledby="onboarding-result-heading">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] text-[var(--accent)]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="onboarding-result-heading" className="text-lg font-semibold">Setup result</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  The user opens the link, sets a password, confirms it, then signs in.
                </p>
              </div>
            </div>

            {result ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Link ready for {result.user.email}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Assigned {getOnboardingRoleLabel(result.onboarding.role)}.
                  </p>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="onboarding-setup-link" className="text-sm font-medium">Setup link</label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      id="onboarding-setup-link"
                      className={inputClass}
                      readOnly
                      value={result.onboarding.setupUrl}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => void copySetupLink()}
                    >
                      {copyLabel}
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Expires {new Date(result.onboarding.expiresAt).toLocaleString()}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm leading-6 text-[var(--muted)]">
                Generated links will appear here. Nothing is sent until you copy and share the link.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
