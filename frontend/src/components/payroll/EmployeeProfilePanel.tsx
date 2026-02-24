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
import type { Employee } from "@/lib/payroll-calendar/types";


interface EmployeeProfilePanelProps {
  employee: Employee | null;
  onGeneratePayslip: () => void;
  onDownloadPDF: () => void;
}

export default function EmployeeProfilePanel({
  employee,
  onGeneratePayslip,
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
              <span>{employee.avatar}</span>
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
        <div className="space-y-2">
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

          {employee.phone && (
            <div className="flex items-start gap-3 text-sm">
              <Phone className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">Phone number</div>
                <div className="text-[var(--foreground)]">{employee.phone}</div>
              </div>
            </div>
          )}

          {employee.email && (
            <div className="flex items-start gap-3 text-sm">
              <Mail className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">E-Mail</div>
                <div className="text-[var(--foreground)] break-all">
                  {employee.email}
                </div>
              </div>
            </div>
          )}

          {employee.citizenship && (
            <div className="flex items-start gap-3 text-sm">
              <Globe className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">Citizenship</div>
                <div className="text-[var(--foreground)]">{employee.citizenship}</div>
              </div>
            </div>
          )}

          {employee.city && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">City</div>
                <div className="text-[var(--foreground)]">{employee.city}</div>
              </div>
            </div>
          )}

          {employee.address && (
            <div className="flex items-start gap-3 text-sm">
              <Home className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[var(--muted)]">Address</div>
                <div className="text-[var(--foreground)]">{employee.address}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-[var(--foreground)]">
          Documents
        </h4>
        <div className="space-y-2">
          <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 dark:bg-white/5 border border-dashed border-[var(--border)]">
            <Upload className="w-8 h-8 text-[var(--muted)] mb-2" />
            <p className="text-sm text-[var(--muted)]">No documents uploaded</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <Button
          variant="primary"
          className="w-full"
          onClick={onGeneratePayslip}
        >
          Generate Payslip
        </Button>
        <Button
          variant="outline"
          className="w-full"
          icon={<Download className="w-4 h-4" />}
          onClick={onDownloadPDF}
        >
          Download PDF
        </Button>
      </div>
    </div>
  );
}
