/**
 * Payslip Details Modal - view complete payslip information
 */

import React from "react";
import { FileText, Download, Printer } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { Payslip } from "@/lib/payroll-calendar/types";
import { MOCK_EMPLOYEES } from "@/lib/payroll-calendar/mock-data";

interface PayslipDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip | null;
  onDownloadPDF: (payslip: Payslip) => void;
}

export default function PayslipDetailsModal({
  isOpen,
  onClose,
  payslip,
  onDownloadPDF,
}: PayslipDetailsModalProps) {
  if (!payslip) return null;

  const employee = MOCK_EMPLOYEES.find((e) => e.id === payslip.employeeId);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payslip Details" size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {employee?.avatar || "?"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              {payslip.employeeName}
            </h2>
            <p className="text-sm text-[var(--muted)]">{employee?.role}</p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              payslip.status === "paid"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : payslip.status === "issued"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            }`}
          >
            {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
          </div>
        </div>

        {/* Pay Period Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs text-[var(--muted)] mb-1">Pay Period</div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              {formatDate(payslip.payPeriodStart)} - {formatDate(payslip.payPeriodEnd)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs text-[var(--muted)] mb-1">Issue Date</div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              {formatDate(payslip.issueDate)}
            </div>
          </div>
        </div>

        {/* Earnings Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Earnings
          </h3>
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)]">
                    Description
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--muted)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                    Base Salary
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-[var(--foreground)]">
                    ${payslip.grossPay.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                    Hours Worked
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-[var(--foreground)]">
                    {payslip.hoursWorked} hrs
                  </td>
                </tr>
                <tr className="border-t border-[var(--border)] bg-emerald-50 dark:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
                    Total Gross Pay
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-emerald-600 dark:text-emerald-400">
                    ${payslip.grossPay.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deductions Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Deductions
          </h3>
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)]">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)]">
                    Description
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--muted)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payslip.deductions.map((deduction) => (
                  <tr key={deduction.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 text-xs text-[var(--muted)] capitalize">
                      {deduction.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                      {deduction.name}
                      {deduction.percentage && (
                        <span className="ml-1 text-xs text-[var(--muted)]">
                          ({deduction.percentage}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-red-600 dark:text-red-400">
                      -${deduction.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] bg-red-50 dark:bg-red-900/10">
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
                    Total Deductions
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-red-600 dark:text-red-400">
                    -${payslip.deductions
                      .reduce((sum, d) => sum + d.amount, 0)
                      .toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Pay - Highlighted */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Net Pay</div>
              <div className="text-3xl font-bold">${payslip.netPay.toLocaleString()}</div>
            </div>
            <FileText className="w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* Notes */}
        {payslip.notes && (
          <div className="mb-6 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs text-[var(--muted)] mb-1">Notes</div>
            <div className="text-sm text-[var(--foreground)]">{payslip.notes}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => onDownloadPDF(payslip)}
          >
            Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
