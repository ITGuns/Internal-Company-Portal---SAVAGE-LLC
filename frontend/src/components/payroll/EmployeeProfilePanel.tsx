/**
 * Employee Profile Panel - displays detailed employee information
 */

import React, { useState } from "react";
import Image from "next/image";
import {
  FileText,
  Download,
  Calendar,
  Mail,
  Upload,
  Clock,
  WalletCards,
  Settings2,
  Percent,
  Tag,
  History,
} from "lucide-react";
import Button from "@/components/Button";
import { useUser } from "@/contexts/UserContext";
import { canSignDisbursement, hasPayrollManagementAccess } from "@/lib/role-access";
import { getPayBasisLabel } from "@/lib/pay-basis";
import { describeScheme, findScheme, getOptionLabel } from "@/lib/payroll-options";
import { formatCapHours, type PayrollProfile } from "@/lib/payroll-setup";
import { describeTaxChoice } from "@/lib/payroll-tax";
import { categoryLabel } from "@/lib/employee-history";
import EmployeeHistoryDialog from "./EmployeeHistoryDialog";
import PayrollSetupDialogs from "./PayrollSetupDialogs";
import PayslipHistoryItem from "./PayslipHistoryItem";
import { usePayrollCatalog, usePayrollProfile } from "./usePayrollOptions";
import { usePayrollSetupDialogs } from "./usePayrollSetupDialogs";
import type { Employee, Payslip } from "@/lib/payroll-calendar/types";


interface EmployeeProfilePanelProps {
  employee: Employee | null;
  onGeneratePayslip: () => void;
  payslips: Payslip[];
  onViewPayslip: (payslip: Payslip) => void;
  onDownloadPDF: (payslip: Payslip) => void;
  onEditPayslip?: (payslip: Payslip) => void;
  /** Opens the disbursement sign-off for one payslip (2026-10-28). */
  onApprovePayslip?: (payslip: Payslip) => void;
  isPeriodLocked?: boolean;
  /** Called after Set Up Payroll saves, so views that show pay settings can update. */
  onPayrollSaved?: (employeeId: string, profile: PayrollProfile) => void;
}

export default function EmployeeProfilePanel({
  employee,
  onGeneratePayslip,
  payslips,
  onViewPayslip,
  onDownloadPDF,
  onEditPayslip,
  onApprovePayslip,
  isPeriodLocked = false,
  onPayrollSaved,
}: EmployeeProfilePanelProps) {
  const { user } = useUser();
  const canManagePayroll = hasPayrollManagementAccess(user);
  const canSign = canSignDisbursement(user);
  const dialogs = usePayrollSetupDialogs();
  const catalog = usePayrollCatalog(Boolean(employee));
  // The saved profile, refetched after Set Up Payroll or a list change.
  const { data: profile } = usePayrollProfile(employee ? String(employee.id) : null);
  // Payroll history dialog: this person across pay periods (2026-10-28).
  const [historyOpen, setHistoryOpen] = useState(false);
  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[var(--muted)]" />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Select an employee to view details
          </p>
        </div>
      </div>
    );
  }

  const scheme = findScheme(catalog.schemes, profile?.payrollScheme ?? employee.payrollScheme);
  const payBasis = profile?.payBasis ?? employee.payBasis;
  const frequency = getOptionLabel(catalog.paymentFrequencies, profile?.paymentFrequency ?? employee.paymentFrequency);
  const schemeValue = scheme?.name ?? (catalog.error ? "Could not load the scheme list" : catalog.isLoading ? "Loading" : "Not set");
  const setupRows = [
    // The employment type; null on a loaded profile means none is stored.
    { icon: Tag, label: "Category", value: categoryLabel(catalog.employmentTypes, profile ? profile.employmentType : employee.employmentType) },
    { icon: WalletCards, label: "Pay basis", value: getPayBasisLabel(payBasis) },
    { icon: WalletCards, label: "Salary divisor scheme", value: schemeValue, detail: scheme ? describeScheme(scheme) : undefined },
    { icon: Clock, label: "Max billable hours", value: formatCapHours(profile?.maxBillableHoursPerDay ?? employee.maxBillableHoursPerDay) },
    { icon: Calendar, label: "Pay frequency", value: frequency || "Not set" },
    {
      icon: Percent,
      label: "Withholding tax",
      // null on a loaded profile means "workspace default", so it must not fall back to the list row.
      value: catalog.taxRules ? describeTaxChoice(catalog.taxRules, profile ? profile.taxRule : employee.taxRule) : catalog.isLoading ? "Loading" : "Not set",
    },
  ];

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full chat-scroll">
      {/* Profile Header with Decorative Background */}
      <div className="relative">
        {/* Decorative background */}
        <div className="h-24 rounded-t-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white transform translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white transform -translate-x-4 translate-y-4" />
          </div>
        </div>

        {/* Profile Photo */}
        <div className="relative -mt-12 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-white dark:border-gray-900 overflow-hidden shadow-lg">
            {employee.avatar && (employee.avatar.startsWith('http') || employee.avatar.startsWith('/')) ? (
              <Image src={employee.avatar} alt={employee.name} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <span>{employee.avatar?.[0] || '?'}</span>
            )}
          </div>
        </div>

        {/* Name and Role */}
        <div className="text-center mt-3">
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {employee.name}
          </h3>
          <p className="text-sm text-[var(--muted)]">{employee.role}</p>
        </div>
      </div>

      {/* Basic Information */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-[var(--foreground)]">
          Basic Information
        </h4>
        <div className="space-y-3">
          {employee.birthday && (
            <div className="flex items-start gap-3 text-sm">
              <Calendar className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">Birthday</div>
                <div className="text-[var(--foreground)]">
                  {new Date(employee.birthday).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}

          {employee.email && (
            <div className="flex items-start gap-3 text-sm">
              <Mail className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">E-Mail</div>
                <div className="text-[var(--foreground)] break-all font-medium">
                  {employee.email}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents / Payslips */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-[var(--foreground)]">
          Payroll Setup
        </h4>
        <dl className="grid grid-cols-1 gap-2">
          {setupRows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3 text-sm">
              <row.icon className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-[var(--muted)]">{row.label}</dt>
                <dd className="font-semibold text-[var(--foreground)]">{row.value}</dd>
                {row.detail && <dd className="mt-0.5 text-xs text-[var(--muted)]">{row.detail}</dd>}
              </div>
            </div>
          ))}
        </dl>
        {catalog.error && (
          <button
            type="button"
            onClick={catalog.retry}
            className="mt-2 inline-flex min-h-9 items-center rounded-[var(--radius-sm)] px-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Try loading the payroll lists again
          </button>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3 text-[var(--foreground)] flex justify-between items-center">
          <span>Payslip History</span>
          {payslips.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[10px] font-bold text-blue-600">
              {payslips.length} ISSUED
            </span>
          )}
        </h4>
        <div className="space-y-2">
          {payslips.length > 0 ? (
            payslips.map((ps) => (
              <PayslipHistoryItem
                key={ps.id}
                payslip={ps}
                onView={onViewPayslip}
                onEdit={onEditPayslip}
                onApprove={onApprovePayslip}
                canSign={canSign}
                isOwn={user?.id != null && String(user.id) === String(ps.employeeId)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-gray-50/50 dark:bg-white/5 border border-dashed border-[var(--border)]">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-[var(--muted)]" />
              </div>
              <p className="text-xs text-[var(--muted)] text-center font-medium">No payslips generated for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4 border-t border-[var(--border)]">
        <Button
          variant="outline"
          className="w-full h-11 border-2 border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 transition-colors font-semibold text-sm"
          icon={<Settings2 className="w-4 h-4" />}
          onClick={() => dialogs.openSetup(employee)}
        >
          Set Up Payroll
        </Button>
        <Button
          variant="primary"
          className={`w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 group relative overflow-hidden ${isPeriodLocked ? 'opacity-55 cursor-not-allowed' : ''}`}
          onClick={onGeneratePayslip}
          disabled={isPeriodLocked}
          title={isPeriodLocked ? "Payroll period is locked and finalized" : undefined}
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            <span>{isPeriodLocked ? 'Locked / Finalized' : 'Generate Payslip'}</span>
          </div>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </Button>
        {payslips.length > 0 && (
          <Button
            variant="outline"
            className="w-full h-11 border-2 border-[var(--border)] hover:bg-[var(--card-surface)] transition-colors font-semibold text-sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => onDownloadPDF(payslips[0])}
          >
            Download Latest PDF
          </Button>
        )}
        {canManagePayroll && (
          <Button
            variant="outline"
            className="w-full h-11 border-2 border-[var(--border)] hover:bg-[var(--card-surface)] transition-colors font-semibold text-sm"
            icon={<History className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setHistoryOpen(true)}
          >
            Payroll history
          </Button>
        )}
      </div>

      <PayrollSetupDialogs dialogs={dialogs} canManageOptions={canManagePayroll} onSaved={onPayrollSaved} />
      <EmployeeHistoryDialog
        employee={historyOpen ? { id: String(employee.id), name: employee.name } : null}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}
