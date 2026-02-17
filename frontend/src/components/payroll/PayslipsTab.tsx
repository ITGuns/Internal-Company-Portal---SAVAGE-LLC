/**
 * Payslips Management Tab - Time & Salary Management with 3-column layout
 */

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import EmployeeSidebarItem from "./EmployeeSidebarItem";
import TimeTrackingCalendar from "./TimeTrackingCalendar";
import EmployeeProfilePanel from "./EmployeeProfilePanel";
import GeneratePayslipModal from "./GeneratePayslipModal";
import PayslipDetailsModal from "./PayslipDetailsModal";
import { MOCK_EMPLOYEES, MOCK_PAYSLIPS } from "@/lib/payroll-calendar/mock-data";
import { generatePayslipPDF } from "@/lib/payroll-calendar/payslip-utils";
import type { Employee, Payslip } from "@/lib/payroll-calendar/types";

export default function PayslipsTab() {
  const toast = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(MOCK_EMPLOYEES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>(MOCK_PAYSLIPS);

  // Filter employees based on search
  const filteredEmployees = MOCK_EMPLOYEES.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle employee selection
  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  // Handle time entry addition (placeholder)
  const handleAddTimeEntry = (date: string) => {
    toast.info(`Add time entry for ${date} - Feature coming soon!`);
  };

  // Handle payslip generation
  const handleGeneratePayslip = (payslipData: any) => {
    if (!selectedEmployee) return;

    const newPayslip: Payslip = {
      id: `ps${payslips.length + 1}`,
      employeeId: payslipData.employeeId,
      employeeName: selectedEmployee.name,
      payPeriodStart: payslipData.payPeriodStart,
      payPeriodEnd: payslipData.payPeriodEnd,
      issueDate: new Date().toISOString().split("T")[0],
      status: "draft",
      hoursWorked: payslipData.hoursWorked,
      grossPay: payslipData.grossPay,
      deductions: payslipData.deductions,
      netPay: payslipData.netPay,
    };

    setPayslips([...payslips, newPayslip]);
    toast.success(`Payslip generated for ${selectedEmployee.name}`);
  };

  // Handle PDF download
  const handleDownloadPDF = (payslip?: Payslip) => {
    const targetPayslip = payslip || (selectedEmployee && payslips.find(p => p.employeeId === selectedEmployee.id));
    if (targetPayslip && selectedEmployee) {
      const employee = MOCK_EMPLOYEES.find(e => e.id === targetPayslip.employeeId);
      if (employee) {
        generatePayslipPDF(targetPayslip, employee);
        toast.success(`PDF downloaded for ${employee.name}`);
      }
    } else {
      toast.error("Unable to generate PDF - payslip or employee not found");
    }
  };

  // Handle view latest payslip
  const handleViewPayslip = () => {
    if (!selectedEmployee) return;
    const employeePayslip = payslips.find(p => p.employeeId === selectedEmployee.id);
    if (employeePayslip) {
      setSelectedPayslip(employeePayslip);
      setShowDetailsModal(true);
    } else {
      toast.info("No payslip found for this employee");
    }
  };

  return (
    <div className="h-full flex flex-col p-6 pt-0">
      {/* 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 min-h-0">
        {/* Left Column - Employee Sidebar */}
        <div className="flex flex-col bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-[var(--muted)]"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredEmployees.map((employee) => (
              <EmployeeSidebarItem
                key={employee.id}
                employee={employee}
                isSelected={selectedEmployee?.id === employee.id}
                onClick={() => handleSelectEmployee(employee)}
              />
            ))}
            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-sm text-[var(--muted)]">
                No employees found
              </div>
            )}
          </div>
        </div>

        {/* Center Column - Time Tracking Calendar */}
        <div className="h-fit bg-[var(--card-bg)] rounded-lg border border-[var(--border)] px-6 pt-6 pb-3 overflow-hidden">
          <TimeTrackingCalendar
            employee={selectedEmployee}
            onAddTimeEntry={handleAddTimeEntry}
          />
        </div>

        {/* Right Column - Employee Profile Panel */}
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
          <EmployeeProfilePanel
            employee={selectedEmployee}
            onGeneratePayslip={() => setShowGenerateModal(true)}
            onDownloadPDF={() => handleViewPayslip()}
          />
        </div>
      </div>

      {/* Modals */}
      <GeneratePayslipModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGeneratePayslip}
        selectedEmployee={selectedEmployee}
      />

      <PayslipDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        payslip={selectedPayslip}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );
}

