/**
 * Payslips Management Tab - Time & Salary Management with 3-column layout
 */

import React, { useState, useEffect } from "react";
import { Search, Loader2, Zap, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import EmployeeSidebarItem from "./EmployeeSidebarItem";
import TimeTrackingCalendar from "./TimeTrackingCalendar";
import EmployeeProfilePanel from "./EmployeeProfilePanel";
import GeneratePayslipModal from "./GeneratePayslipModal";
import PayslipDetailsModal from "./PayslipDetailsModal";
import AddTimeEntryModal from "./AddTimeEntryModal";
import { createTimeEntry, deleteTimeEntry } from "@/lib/time-entries";

import { generatePayslipPDF } from "@/lib/payroll-calendar/payslip-utils";
import type { Employee, Payslip } from "@/lib/payroll-calendar/types";

export default function PayslipsTab() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  // Local state for the selected employee's payslips
  const [employeePayslips, setEmployeePayslips] = useState<Payslip[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchPayslips = async (employee: Employee) => {
    try {
      const res = await apiFetch(`/payroll/my-payslips?userId=${employee.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeePayslips(data.map((ps: any) => ({
          id: ps.id,
          employeeId: ps.userId,
          employeeName: employee.name,
          payPeriodStart: ps.period.startDate ? ps.period.startDate.split('T')[0] : 'N/A',
          payPeriodEnd: ps.period.endDate ? ps.period.endDate.split('T')[0] : 'N/A',
          issueDate: ps.generatedAt ? ps.generatedAt.split('T')[0] : 'N/A',
          status: ps.status || "issued",
          hoursWorked: employee.salary > 0 ? (ps.items.find((i: any) => i.description.includes('Hourly'))?.amount / employee.salary || 0) : 0,
          grossPay: ps.grossPay,
          netPay: ps.netPay,
          deductions: ps.items.filter((i: any) => i.amount < 0).map((i: any) => ({
            id: i.id,
            type: 'other',
            name: i.description,
            amount: Math.abs(i.amount)
          }))
        })));
      }
    } catch (err) {
      console.error("Failed to fetch payslips", err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch deployed employees
      const empRes = await apiFetch('/employees/deployed');
      const empData = await empRes.json();

      if (!Array.isArray(empData)) {
        const error = empData.error || "Invalid data format from server";
        throw new Error(error);
      }

      const normalizedEmployees = empData.map((emp: any) => ({
        ...emp,
        hoursThisWeek: emp.hoursThisWeek || 0,
        performance: emp.performance || 0,
        salary: emp.salary || (emp.employeeProfile?.baseSalary) || 0,
        department: emp.department || (emp.employeeProfile?.department?.name) || "Operations",
        role: emp.role || (emp.employeeProfile?.jobTitle) || "Member",
        avatar: emp.avatar || (emp.name?.[0] || "U"),
        status: emp.status || "active",
        email: emp.email || "no-email@company.com"
      }));

      setEmployees(normalizedEmployees);
      if (normalizedEmployees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(normalizedEmployees[0]);
      }
    } catch (err: any) {
      console.error("Failed to fetch data", err);
      toast.error(err.message === "Failed to fetch" ? "Connection failed" : (err.message || "Failed to load employees"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch payslips when selected employee changes or manual refresh
  useEffect(() => {
    if (selectedEmployee) {
      fetchPayslips(selectedEmployee);
    }
  }, [selectedEmployee, refreshKey]);

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle employee selection
  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  // Handle time entry addition
  const handleAddTimeEntry = (date: string) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const handleSubmitTimeEntry = async (startIso: string, endIso?: string, notes?: string, userId?: string) => {
    const success = await createTimeEntry(startIso, endIso, notes, userId || selectedEmployee?.id.toString());
    if (success) {
      toast.success("Time entry added successfully");
      setRefreshKey(prev => prev + 1);
    } else {
      toast.error("Failed to add time entry");
    }
    return !!success;
  };

  const handleDeleteTimeEntry = async (id: string) => {
    const success = await deleteTimeEntry(id);
    if (success) {
      toast.success("Time entry deleted");
      setRefreshKey(prev => prev + 1);
    } else {
      toast.error("Failed to delete entry");
    }
  };

  // Handle payslip generation
  const handleGeneratePayslip = async (payslipData: any) => {
    if (!selectedEmployee) return;

    try {
      // 1. Ensure a period exists (auto-create if none) — idempotent
      const ensureRes = await apiFetch('/payroll/periods/ensure', { method: 'POST' });
      if (!ensureRes.ok) {
        toast.error("Failed to initialize payroll period.");
        return;
      }
      const { periodId } = await ensureRes.json();

      // 2. Generate the payslip for this employee in that period
      const genRes = await apiFetch(`/payroll/periods/${periodId}/generate/${selectedEmployee.id}`, {
        method: 'POST'
      });

      if (genRes.ok) {
        toast.success(`Payslip generated for ${selectedEmployee.name}`);
        // Refresh payslips list
        fetchData();
        setRefreshKey(prev => prev + 1);
      } else {
        const errData = await genRes.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }
    } catch (err: any) {
      console.error("Failed to generate", err);
      toast.error(err.message || "Failed to generate payslip");
    }
  };

  // Handle payslip generation for ALL employees
  const handleBulkGenerate = async () => {
    try {
      setIsBulkGenerating(true);
      // 1. Ensure a period exists
      const ensureRes = await apiFetch('/payroll/periods/ensure', { method: 'POST' });
      if (!ensureRes.ok) throw new Error("Failed to initialize period");
      const { periodId } = await ensureRes.json();

      // 2. Perform bulk generation
      const bulkRes = await apiFetch(`/payroll/periods/${periodId}/generate-all`, { method: 'POST' });
      if (bulkRes.ok) {
        const results = await bulkRes.json();
        const successCount = results.filter((r: any) => r.success).length;
        toast.success(`Calculated and generated ${successCount} company-wide payslips successfully!`);

        // Refresh data
        fetchData();
        setRefreshKey(prev => prev + 1); // Refresh current employee view
      } else {
        throw new Error("Bulk generation failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Bulk generation failed");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = (payslip?: Payslip) => {
    const targetPayslip = payslip || employeePayslips[0];
    if (targetPayslip && selectedEmployee) {
      generatePayslipPDF(targetPayslip, selectedEmployee);
      toast.success(`PDF downloaded for ${selectedEmployee.name}`);
    } else {
      toast.error("Unable to generate PDF - payslip or employee not found");
    }
  };

  // Handle view latest payslip
  const handleViewPayslip = () => {
    if (employeePayslips.length > 0) {
      setSelectedPayslip(employeePayslips[0]);
      setShowDetailsModal(true);
    } else {
      toast.info("No payslip found for this employee");
    }
  };

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-[var(--muted)]">Loading payroll data...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 pt-0">
      {/* 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 min-h-0">
        {/* Left Column - Employee Sidebar */}
        <div className="flex flex-col bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
          {/* Action Area - Automated Payroll */}
          <div className="p-4 border-b border-[var(--border)] bg-gray-50/50 dark:bg-black/20">
            <button
              onClick={handleBulkGenerate}
              disabled={isBulkGenerating}
              className={`w-full group relative overflow-hidden flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-extrabold transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 active:scale-[0.98] ${isBulkGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Calculates payroll based on work hours/timers for all Deployed employees"
            >
              {/* Shine effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />

              {isBulkGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}

              <span className="relative z-10">
                {isBulkGenerating ? 'Calculating Payroll...' : 'Run Automated Payroll'}
              </span>

              {!isBulkGenerating && (
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse relative z-10" />
              )}
            </button>
          </div>

          {/* Search Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Find employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-[var(--muted)]"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-scroll">
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
            onDeleteTimeEntry={handleDeleteTimeEntry}
            refreshKey={refreshKey}
          />
        </div>

        {/* Right Column - Employee Profile Panel */}
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
          <EmployeeProfilePanel
            employee={selectedEmployee}
            onGeneratePayslip={() => setShowGenerateModal(true)}
            payslips={employeePayslips}
            onViewPayslip={(ps) => {
              setSelectedPayslip(ps);
              setShowDetailsModal(true);
            }}
            onDownloadPDF={(ps) => handleDownloadPDF(ps)}
          />
        </div>
      </div>

      {/* Modals */}
      <GeneratePayslipModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGeneratePayslip}
        selectedEmployee={selectedEmployee}
        employees={employees}
      />

      <PayslipDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        payslip={selectedPayslip}
        onDownloadPDF={handleDownloadPDF}
      />

      <AddTimeEntryModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDate(null);
        }}
        onSubmit={handleSubmitTimeEntry}
        initialUserId={selectedEmployee?.id.toString()}
        initialDate={selectedDate || undefined}
      />
    </div>
  );
}

