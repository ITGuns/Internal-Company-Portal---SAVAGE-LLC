/**
 * Set Up Payroll (rebuilt 2026-10-20): one page in two columns on desktop
 * (pay basis and live rates left, details right), one column on a phone, with
 * Cancel and Save in a fixed footer. Employment type, pay frequency and the
 * salary divisor scheme come from the managed lists (GET /payroll/schemes and
 * /payroll/options/:category). Saves to POST /payroll/config/:userId.
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import type { Employee } from "@/lib/payroll-calendar/types";
import { validatePayBasisConfig } from "@/lib/pay-basis";
import { findScheme } from "@/lib/payroll-options";
import {
  PAYROLL_OPTIONS_QUERY_KEY,
  PAYROLL_PROFILE_QUERY_KEY,
  fetchPayrollProfile,
  payrollProfileQueryKey,
  savePayrollProfile,
} from "@/lib/payroll-options-api";
import {
  buildSetupPayload,
  profileToSetupForm,
  validateCapHours,
  type PayrollProfile,
  type PayrollSetupForm,
} from "@/lib/payroll-setup";
import PayBasisPicker from "./PayBasisPicker";
import PayrollRatePreview from "./PayrollRatePreview";
import PayrollSetupDetails from "./PayrollSetupDetails";
import { usePayrollCatalog } from "./usePayrollOptions";

interface PayrollSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  /** Called with the saved profile so lists can update in place. */
  onSaved?: (employeeId: string, profile: PayrollProfile) => void;
  /** Payroll roles: opens Payroll options. The parent closes this dialog first and reopens it after. */
  onManageOptions?: () => void;
  /** Reopening after Payroll options: keep the unsaved form instead of loading it again. */
  preserveDraft?: boolean;
}

type LoadState =
  | { employeeId: string; status: "loading" }
  | { employeeId: string; status: "error"; message: string }
  | { employeeId: string; status: "ready"; profile: PayrollProfile; edits: PayrollSetupForm | null };

const sectionTitleClass = "text-xs font-semibold uppercase tracking-wide text-[var(--muted)]";

function SetupSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-hidden="true">
      <div className="space-y-2">
        {[0, 1, 2].map((row) => <div key={row} className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--card-surface)]" />)}
        <div className="h-40 animate-pulse rounded-[var(--radius-md)] bg-[var(--card-surface)]" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((row) => <div key={row} className="h-10 animate-pulse rounded-[var(--radius-md)] bg-[var(--card-surface)]" />)}
      </div>
    </div>
  );
}

function InlineAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 p-3 text-sm text-[var(--foreground)]">
      <span className="min-w-0">{message}</span>
      {onRetry && (
        <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export default function PayrollSetupModal({
  isOpen,
  onClose,
  employee,
  onSaved,
  onManageOptions,
  preserveDraft = false,
}: PayrollSetupModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const catalog = usePayrollCatalog(isOpen);
  const employeeId = employee ? String(employee.id) : null;
  const [state, setState] = useState<LoadState | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Month for the weekdays scheme in the preview; fixed while the dialog is mounted.
  const [referenceDate] = useState(() => new Date());

  // Load the saved setup each time the dialog opens, unless it comes back from Payroll options.
  useEffect(() => {
    if (!isOpen || !employeeId || preserveDraft) return;
    let active = true;
    setState({ employeeId, status: "loading" });
    setSaveError(null);
    fetchPayrollProfile(employeeId)
      .then((profile) => {
        if (!active) return;
        queryClient.setQueryData(payrollProfileQueryKey(employeeId), profile);
        setState({ employeeId, status: "ready", profile, edits: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ employeeId, status: "error", message: error instanceof Error ? error.message : "Could not load the payroll setup." });
      });
    return () => {
      active = false;
    };
  }, [isOpen, employeeId, preserveDraft, queryClient, reloadCount]);

  const ready = state?.status === "ready" && state.employeeId === employeeId ? state : null;
  const form = useMemo(() => {
    if (!ready) return null;
    if (ready.edits) return ready.edits;
    return catalog.isReady ? profileToSetupForm(ready.profile, catalog.defaults) : null;
  }, [ready, catalog.isReady, catalog.defaults]);

  const updateForm = (field: keyof PayrollSetupForm, value: string) => {
    if (!form) return;
    setState((current) => (current?.status === "ready" ? { ...current, edits: { ...(current.edits ?? form), [field]: value } } : current));
  };

  // An unknown or deleted scheme key shows (and saves) the default scheme.
  const scheme = form ? findScheme(catalog.schemes, form.payrollScheme) : undefined;
  const schemeKey = scheme?.key ?? "";
  const payBasisCheck = form ? validatePayBasisConfig(form) : null;
  const capError = form ? validateCapHours(form.maxBillableHoursPerDay) : undefined;
  const canSave = Boolean(form && payBasisCheck?.valid && !capError && schemeKey && !isSaving);

  const handleSave = async () => {
    if (!employee || !employeeId || !form || !canSave) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const profile = await savePayrollProfile(employeeId, buildSetupPayload({ ...form, payrollScheme: schemeKey }));
      queryClient.setQueryData(payrollProfileQueryKey(employeeId), profile);
      // Usage counts and other views of this person change with the save.
      void queryClient.invalidateQueries({ queryKey: PAYROLL_OPTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PAYROLL_PROFILE_QUERY_KEY });
      toast.success(`Payroll setup saved for ${employee.name}`);
      onSaved?.(employeeId, profile);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the payroll setup.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) return null;

  const isLoading = !state || state.status === "loading" || (Boolean(ready) && !form && !catalog.error);
  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleSave}
        disabled={!canSave}
        loading={isSaving}
        icon={<Save className="h-4 w-4" aria-hidden="true" />}
      >
        {isSaving ? "Saving" : "Save setup"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set up payroll"
      subtitle={`Pay rules for ${employee.name}`}
      size="xl"
      bodyClassName="max-h-[calc(100dvh-12.5rem)]"
      footer={footer}
    >
      <div className="space-y-4">
        {state?.status === "error" && <InlineAlert message={state.message} onRetry={() => setReloadCount((count) => count + 1)} />}
        {catalog.error && <InlineAlert message={`The payroll lists did not load. ${catalog.error}`} onRetry={catalog.retry} />}
        {saveError && <InlineAlert message={saveError} />}

        {isLoading && state?.status !== "error" && !catalog.error && <SetupSkeleton />}

        {form && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="min-w-0 space-y-5">
              <section aria-labelledby="payroll-setup-basis" className="space-y-3">
                <h3 id="payroll-setup-basis" className={sectionTitleClass}>How this person is paid</h3>
                <PayBasisPicker
                  payBasis={form.payBasis}
                  hourlyRate={form.hourlyRate}
                  currency={form.currency}
                  hourlyRateError={payBasisCheck?.errors.hourlyRate}
                  disabled={isSaving}
                  onChange={updateForm}
                />
              </section>
              <PayrollRatePreview form={form} scheme={scheme} referenceDate={referenceDate} />
            </div>

            <div className="min-w-0 space-y-5">
              {onManageOptions && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
                  <span>Employment types, pay frequencies and schemes are lists you can change.</span>
                  <button
                    type="button"
                    onClick={onManageOptions}
                    disabled={isSaving}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    Manage options
                  </button>
                </div>
              )}
              <PayrollSetupDetails
                form={form}
                schemeKey={schemeKey}
                schemes={catalog.schemes}
                employmentTypes={catalog.employmentTypes}
                paymentFrequencies={catalog.paymentFrequencies}
                listsLoading={!catalog.isReady}
                errors={{
                  baseSalary: payBasisCheck?.errors.baseSalary,
                  overtimeMultiplier: payBasisCheck?.errors.overtimeMultiplier,
                  maxBillableHoursPerDay: capError,
                }}
                disabled={isSaving}
                onChange={updateForm}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
