/**
 * Employee Edit Modal - edit employee information
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Edit2, Save } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";
import {
  buildEmployeeRoleCatalog,
  getEmployeeDepartmentNames,
  getEmployeeRolesForDepartment,
} from "@/lib/payroll-calendar/employee-role-catalog";
import {
  fetchOperationsDepartments,
  OPERATIONS_CACHE_GC_MS,
  OPERATIONS_CORE_STALE_MS,
  OPERATIONS_QUERY_KEYS,
} from "@/lib/operations-data";
import { findScheme, selectableSchemes } from "@/lib/payroll-options";
import { usePayrollSchemes } from "./usePayrollOptions";

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  /**
   * Saves the changes. The dialog waits for it and stays open, showing the
   * error, when it throws or returns false.
   */
  onSave: (employeeId: string | number, updates: Partial<Employee>) => void | boolean | Promise<void | boolean>;
}

// The statuses PATCH /users/:id accepts (backend PATCHABLE_MEMBER_STATUSES).
// Pending applicants and inactive members have their own flows (approve,
// deactivate, reactivate), so they are never offered here.
const EDITABLE_STATUSES = [
  { value: "verified", label: "Verified" },
  { value: "active", label: "Active" },
  { value: "vacation", label: "On Vacation" },
  { value: "leave", label: "On Leave" },
] as const;

const isEditableStatus = (value: string) => EDITABLE_STATUSES.some((option) => option.value === value);

const SAVE_FAILED = "The changes were not saved. Check the details and try again.";

export default function EmployeeEditModal({
  isOpen,
  onClose,
  employee,
  onSave,
}: EmployeeEditModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [maxBillableHoursPerDay, setMaxBillableHoursPerDay] = useState("8");
  // Empty until chosen; the select shows the employee's scheme or the list default.
  const [payrollScheme, setPayrollScheme] = useState("");
  const schemesQuery = usePayrollSchemes(isOpen);
  const shownScheme = findScheme(schemesQuery.data, payrollScheme || employee?.payrollScheme);
  const [status, setStatus] = useState<Employee["status"]>("active");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canEditStatus = employee ? isEditableStatus(employee.status) : false;
  const departmentsQuery = useQuery({
    queryKey: OPERATIONS_QUERY_KEYS.departments,
    queryFn: fetchOperationsDepartments,
    enabled: isOpen,
    staleTime: OPERATIONS_CORE_STALE_MS,
    gcTime: OPERATIONS_CACHE_GC_MS,
    placeholderData: keepPreviousData,
  });
  const roleCatalog = useMemo(
    () => buildEmployeeRoleCatalog(departmentsQuery.data),
    [departmentsQuery.data],
  );
  const employeeDepartments = useMemo(
    () => getEmployeeDepartmentNames(roleCatalog),
    [roleCatalog],
  );
  const availableRoles = useMemo(
    () => getEmployeeRolesForDepartment(roleCatalog, department),
    [department, roleCatalog],
  );
  const departmentOptions = useMemo(() => {
    if (department && !employeeDepartments.includes(department)) {
      return [department, ...employeeDepartments];
    }
    return employeeDepartments;
  }, [department, employeeDepartments]);
  const roleOptions = useMemo(() => {
    if (role && !availableRoles.includes(role)) {
      return [role, ...availableRoles];
    }
    return availableRoles;
  }, [availableRoles, role]);
  const isRoleCatalogLoading = isOpen && departmentsQuery.isFetching && !departmentsQuery.data;
  const hasCatalogAssignment = employeeDepartments.includes(department) && availableRoles.includes(role);
  const isPreservingExistingAssignment = Boolean(
    employee &&
    department === employee.department &&
    role === employee.role &&
    !hasCatalogAssignment,
  );
  const canSubmitRoleAssignment = hasCatalogAssignment || isPreservingExistingAssignment;

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email || "");
      setRole(employee.role);
      setDepartment(employee.department);
      setSalary(employee.salary.toString());
      setMaxBillableHoursPerDay(String(employee.maxBillableHoursPerDay || 8));
      setPayrollScheme(employee.payrollScheme || "");
      setStatus(employee.status);
    }
  }, [employee]);

  // A new edit starts without the last attempt's error.
  useEffect(() => {
    if (isOpen) setSaveError(null);
  }, [isOpen, employee]);

  useEffect(() => {
    if (!isOpen || !employee) return;

    const isCurrentDepartment = department === employee.department;
    const isCurrentRole = role === employee.role;

    if (department && !employeeDepartments.includes(department) && !isCurrentDepartment) {
      setDepartment("");
      setRole("");
      return;
    }

    if (role && !availableRoles.includes(role) && !(isCurrentDepartment && isCurrentRole)) {
      setRole("");
    }
  }, [availableRoles, department, employee, employeeDepartments, isOpen, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || saving) return;
    if (!name.trim() || !email.trim() || !role.trim() || !department.trim() || !salary || !canSubmitRoleAssignment) return;

    const chosenScheme = shownScheme?.key;
    const updates: Partial<Employee> = {
      name: name.trim(),
      email: email.trim(),
      salary: parseFloat(salary) || employee.salary,
      maxBillableHoursPerDay: parseFloat(maxBillableHoursPerDay) || employee.maxBillableHoursPerDay || 8,
      // Sent only when it changes, so an unloaded list never resets a scheme.
      ...(chosenScheme && chosenScheme !== employee.payrollScheme ? { payrollScheme: chosenScheme } : {}),
      // Sent only when it changes; PATCH /users/:id saves it since 2026-10-28.
      ...(canEditStatus && status !== employee.status ? { status } : {}),
      ...(hasCatalogAssignment ? { role: role.trim(), department: department.trim() } : {}),
    };

    setSaving(true);
    setSaveError(null);
    try {
      const saved = await onSave(employee.id, updates);
      if (saved === false) {
        setSaveError(SAVE_FAILED);
        return;
      }
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Employee"
      size="md"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-0 pb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Edit Employee
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Update employee information
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
              placeholder="employee@company.com"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-emp-department" className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Department <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <select
                id="edit-emp-department"
                value={department}
                onChange={(e) => {
                  const nextDepartment = e.target.value;
                  setDepartment(nextDepartment);
                  setRole(nextDepartment === employee.department ? employee.role : "");
                }}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
                required
                disabled={isRoleCatalogLoading}
              >
                <option value="" disabled>
                  {isRoleCatalogLoading ? "Loading departments..." : "Select a department..."}
                </option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}{!employeeDepartments.includes(dept) ? " (current - add in Operations)" : ""}
                  </option>
                ))}
              </select>
              {departmentsQuery.isError && (
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  Showing the default org chart. Custom departments may appear after the catalog loads.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="edit-emp-role" className="block text-sm font-semibold text-[var(--foreground)]">
                Role / Position <span className="text-red-500">*</span>
              </label>
              <Link
                href="/operations?tab=roles"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Manage roles
              </Link>
            </div>
            <select
              id="edit-emp-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
              required
              disabled={!department || roleOptions.length === 0 || isRoleCatalogLoading}
            >
              <option value="" disabled>
                {!department
                  ? "Select a department first"
                  : isRoleCatalogLoading
                    ? "Loading roles..."
                    : roleOptions.length === 0
                      ? "No roles available"
                      : "Select a role..."}
              </option>
              {roleOptions.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}{!availableRoles.includes(roleOption) ? " (current - add in Operations)" : ""}
                </option>
              ))}
            </select>
            {!canSubmitRoleAssignment ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                Choose a catalog role or create this role in Operations before changing the assignment.
              </p>
            ) : isPreservingExistingAssignment ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                This existing assignment will be preserved. Add it in Operations to make it available for future edits.
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Custom roles are managed in Operations and appear here after the catalog refreshes.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Monthly Salary <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {/* The profile's currency (set in Set Up Payroll); saving here keeps it. */}
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-semibold">
                {employee.currency || "PHP"}
              </span>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                aria-label={`Monthly salary in ${employee.currency || "PHP"}`}
                className="w-full p-3 pl-14 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                min="0"
                step="any"
                required
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Pay basis, hourly rate and overtime multiplier are in Payslips Management &gt; Set Up Payroll.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                Max billable hours / day <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={maxBillableHoursPerDay}
                onChange={(e) => setMaxBillableHoursPerDay(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                min="0.25"
                step="0.25"
                required
              />
            </div>

            <div>
              <label htmlFor="employee-edit-scheme" className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                Salary divisor scheme <span className="text-red-500">*</span>
              </label>
              <select
                id="employee-edit-scheme"
                value={shownScheme?.key ?? ""}
                onChange={(e) => setPayrollScheme(e.target.value)}
                disabled={!schemesQuery.data}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                required
              >
                {!schemesQuery.data && (
                  <option value="">{schemesQuery.error ? "Could not load the schemes" : "Loading the schemes"}</option>
                )}
                {selectableSchemes(schemesQuery.data, shownScheme?.key).map((scheme) => (
                  <option key={scheme.key} value={scheme.key}>
                    {scheme.name}{scheme.archived ? " (archived)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="employee-edit-status" className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="employee-edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Employee["status"])}
              disabled={!canEditStatus}
              aria-describedby={canEditStatus ? undefined : "employee-edit-status-hint"}
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
              required
            >
              {!canEditStatus && (
                <option value={employee.status}>{employee.status === "pending" ? "Pending Approval" : employee.status}</option>
              )}
              {EDITABLE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {!canEditStatus && (
              <p id="employee-edit-status-hint" className="mt-1.5 text-xs text-[var(--muted)]">
                Approve the application first. Deactivate and reactivate are on the member card.
              </p>
            )}
          </div>

          {saveError && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-[var(--foreground)]">
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
