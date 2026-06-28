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

const PAYROLL_SCHEMES = [
  { value: "weekdays", label: "Weekdays credited" },
  { value: "flat_30", label: "Flat 30 days" },
  { value: "flat_20", label: "Flat 20 days" },
  { value: "flat_160_hours", label: "Flat 160 hours" },
];

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (employeeId: string | number, updates: Partial<Employee>) => void;
}

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
  const [payrollScheme, setPayrollScheme] = useState("weekdays");
  const [status, setStatus] = useState<"active" | "vacation" | "leave" | "pending" | "verified">("active");
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
      setPayrollScheme(employee.payrollScheme || "weekdays");
      setStatus(employee.status);
    }
  }, [employee]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    if (!name.trim() || !email.trim() || !role.trim() || !department.trim() || !salary || !canSubmitRoleAssignment) return;

    const updates: Partial<Employee> = {
      name: name.trim(),
      email: email.trim(),
      salary: parseFloat(salary) || employee.salary,
      maxBillableHoursPerDay: parseFloat(maxBillableHoursPerDay) || employee.maxBillableHoursPerDay || 8,
      payrollScheme,
      status,
    };

    if (hasCatalogAssignment) {
      updates.role = role.trim();
      updates.department = department.trim();
    }

    onSave(employee.id, updates);

    onClose();
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
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-semibold">
                ₱
              </span>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full p-3 pl-8 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                min="0"
                step="any"
                required
              />
            </div>
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
              <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                Payroll scheme <span className="text-red-500">*</span>
              </label>
              <select
                value={payrollScheme}
                onChange={(e) => setPayrollScheme(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                required
              >
                {PAYROLL_SCHEMES.map((scheme) => (
                  <option key={scheme.value} value={scheme.value}>
                    {scheme.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
              required
            >
              <option value="verified">Verified</option>
              <option value="active">Active</option>
              <option value="vacation">On Vacation</option>
              <option value="leave">On Leave</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>

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
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
