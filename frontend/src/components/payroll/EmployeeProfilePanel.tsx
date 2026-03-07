/**
 * Employee Profile Panel - displays detailed employee information
 */

import React from "react";
import {
  FileText,
  Download,
  Calendar,
  Phone,
  Mail,
  Globe,
  MapPin,
  Home,
  Upload,
} from "lucide-react";
import Button from "@/components/Button";
import type { Employee, Payslip } from "@/lib/payroll-calendar/types";


interface EmployeeProfilePanelProps {
  employee: Employee | null;
  onGeneratePayslip: () => void;
  payslips: Payslip[];
  onViewPayslip: (payslip: Payslip) => void;
  onDownloadPDF: (payslip: Payslip) => void;
}

export default function EmployeeProfilePanel({
  employee,
  onGeneratePayslip,
  payslips,
  onViewPayslip,
  onDownloadPDF,
}: EmployeeProfilePanelProps) {
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
              <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
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
            payslips.map((ps) => {
              const periodStart = new Date(ps.payPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const periodEnd = new Date(ps.payPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={ps.id} className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--border)] group hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-[var(--border)] flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[var(--foreground)] truncate">
                        {periodStart} - {periodEnd}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-medium flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">₱{ps.netPay.toLocaleString()}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span className="uppercase tracking-wider opacity-70">{ps.status}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onViewPayslip(ps)}
                      className="p-1 px-3 text-[10px] font-bold bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-700 shadow-md transform translate-x-2 group-hover:translate-x-0"
                    >
                      VIEW
                    </button>
                  </div>
                </div>
              );
            })
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
          variant="primary"
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 group relative overflow-hidden"
          onClick={onGeneratePayslip}
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            <span>Manual Generation</span>
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
      </div>
    </div>
  );
}
