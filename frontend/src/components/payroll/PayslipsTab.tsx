/**
 * Payslips Management Tab - Time & Salary Management with 3-column layout
 */

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Search, Loader2, Zap, Sparkles, LockKeyhole } from "lucide-react";
import Button from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import EmployeeSidebarItem from "./EmployeeSidebarItem";
import TimeTrackingCalendar from "./TimeTrackingCalendar";
import EmployeeProfilePanel from "./EmployeeProfilePanel";
import { PayrollPayslipsManagementSkeleton } from "@/components/ui/FeatureSkeletons";
import { createTimeEntry, deleteTimeEntry } from "@/lib/time-entries";

// Lazy-loaded modals (only rendered when opened)
const GeneratePayslipModal = dynamic(() => import("./GeneratePayslipModal"), { ssr: false });
const PayslipDetailsModal = dynamic(() => import("./PayslipDetailsModal"), { ssr: false });
const AddTimeEntryModal = dynamic(() => import("./AddTimeEntryModal"), { ssr: false });

import { generatePayslipPDF } from "@/lib/payroll-calendar/payslip-utils";
import type { Employee, Payslip } from "@/lib/payroll-calendar/types";
import type { ApiPayslip, ApiPayslipItem, ApiEmployee } from "@/lib/types/api";

export default function PayslipsTab() {
  const toast = useToast();
  const showToastError = toast.error;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Local state for the selected employee's payslips
  const [employeePayslips, setEmployeePayslips] = useState<Payslip[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [activePeriod, setActivePeriod] = useState<any | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  const fetchPayslips = async (employee: Employee) => {
    try {
      const res = await apiFetch(`/payroll/my-payslips?userId=${employee.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeePayslips(data.map((ps: ApiPayslip) => ({
          id: ps.id,
          employeeId: ps.userId,
          employeeName: employee.name,
          payPeriodStart: ps.period.startDate ? ps.period.startDate.split('T')[0] : 'N/A',
          payPeriodEnd: ps.period.endDate ? ps.period.endDate.split('T')[0] : 'N/A',
          issueDate: ps.generatedAt ? ps.generatedAt.split('T')[0] : 'N/A',
          status: ps.status || "issued",
          hoursWorked: employee.salary > 0 ? ((ps.items.find((i: ApiPayslipItem) => i.description.includes('Hourly'))?.amount ?? 0) / employee.salary || 0) : 0,
          grossPay: ps.grossPay,
          netPay: ps.netPay,
          deductions: ps.items.filter((i: ApiPayslipItem) => i.amount < 0).map((i: ApiPayslipItem) => ({
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

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await apiFetch('/payroll/periods');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setActivePeriod(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch periods", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchPeriods();
      // Fetch deployed employees
      const empRes = await apiFetch('/employees/deployed');
      const empData = await empRes.json();

      if (!Array.isArray(empData)) {
        const error = empData.error || "Invalid data format from server";
        throw new Error(error);
      }

      const normalizedEmployees = empData.map((emp: ApiEmployee) => ({
        ...emp,
        hoursThisWeek: emp.hoursThisWeek || 0,
        performance: typeof emp.performance === "number" ? emp.performance : null,
        salary: emp.salary || (emp.employeeProfile?.baseSalary) || 0,
        department: emp.department || (emp.employeeProfile?.department?.name) || "Operations",
        role: emp.role || (emp.employeeProfile?.jobTitle) || "Member",
        payrollScheme: emp.payrollScheme || emp.employeeProfile?.payrollScheme || "weekdays",
        maxBillableHoursPerDay: emp.maxBillableHoursPerDay || emp.employeeProfile?.maxBillableHoursPerDay || 8,
        avatar: emp.avatar || (emp.name?.[0] || "U"),
        status: (emp.status || "active") as Employee['status'],
        email: emp.email || "no-email@company.com"
      }));

      setEmployees(normalizedEmployees);
      if (normalizedEmployees.length > 0) {
        setSelectedEmployee(previous => previous ?? normalizedEmployees[0]);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      const message = err instanceof Error ? err.message : "Failed to load employees";
      showToastError(message === "Failed to fetch" ? "Connection failed" : message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPeriods, showToastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  const handleGeneratePayslip = async (payslipData: Record<string, unknown>) => {
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
        method: 'POST',
        body: JSON.stringify(payslipData)
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
    } catch (err) {
      console.error("Failed to generate", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate payslip");
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
        const successCount = results.filter((r: { success: boolean }) => r.success).length;
        toast.success(`Calculated and generated ${successCount} company-wide payslips successfully!`);

        // Refresh data
        fetchData();
        setRefreshKey(prev => prev + 1); // Refresh current employee view
      } else {
        throw new Error("Bulk generation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Bulk generation failed");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Handle lock/finalize payroll period
  const handleLockPeriod = async () => {
    if (!activePeriod) return;
    if (!window.confirm(`Are you sure you want to finalize and lock the payroll period: ${new Date(activePeriod.startDate).toLocaleDateString('en-US')} to ${new Date(activePeriod.endDate).toLocaleDateString('en-US')}? This will transition its status to processed and prevent any further additions/edits.`)) {
      return;
    }
    try {
      setIsLocking(true);
      const res = await apiFetch(`/payroll/periods/${activePeriod.id}/lock`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success("Payroll period finalized and locked successfully!");
        await fetchPeriods();
        setRefreshKey(prev => prev + 1);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lock failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to lock period");
    } finally {
      setIsLocking(false);
    }
  };
  const handleDownloadPDF = (payslip?: Payslip) => {
    const targetPayslip = payslip || employeePayslips[0];
    if (targetPayslip && selectedEmployee) {
      generatePayslipPDF(targetPayslip, selectedEmployee);
      toast.success(`PDF downloaded for ${selectedEmployee.name}`);
    } else {
      toast.error("Unable to generate PDF - payslip or employee not found");
    }
  };

  if (isLoading && employees.length === 0) {
    return (
      <div className="h-full flex flex-col p-6 pt-0">
        <PayrollPayslipsManagementSkeleton />
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
            {activePeriod && (
              <div className="mb-3 px-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Active Payroll Period</div>
                <div className="text-xs font-semibold text-[var(--foreground)] mt-0.5">
                  {new Date(activePeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(activePeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                    activePeriod.status === 'processed'
                      ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20'
                  }`}>
                    {activePeriod.status}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleBulkGenerate}
              disabled={isBulkGenerating || activePeriod?.status === 'processed'}
              className={`w-full group relative overflow-hidden flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-extrabold transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 active:scale-[0.98] ${(isBulkGenerating || activePeriod?.status === 'processed') ? 'opacity-70 cursor-not-allowed' : ''}`}
              title={activePeriod?.status === 'processed' ? "Cannot run payroll for a processed cycle" : "Calculates payroll based on work hours/timers for all Deployed employees"}
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

            {activePeriod && activePeriod.status === 'draft' && (
              <Button
                variant="outline"
                onClick={handleLockPeriod}
                disabled={isLocking}
                className="w-full mt-2 border-[var(--border)] hover:bg-[var(--card-surface)] text-[11px] font-extrabold h-10 flex items-center justify-center gap-2"
                icon={<LockKeyhole className="w-3.5 h-3.5" />}
              >
                {isLocking ? 'Locking Period...' : 'Lock & Finalize Period'}
              </Button>
            )}
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
            isPeriodLocked={activePeriod?.status === 'processed'}
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

