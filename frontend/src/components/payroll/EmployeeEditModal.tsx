/**
 * Employee Edit Modal - edit employee information
 */

import React, { useState, useEffect } from "react";
import { Edit2, Save } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";
import { DEPARTMENTS, DEPARTMENT_ROLES } from "@/lib/departments";

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
  const [status, setStatus] = useState<"active" | "vacation" | "leave" | "pending">("active");

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email || "");
      setRole(employee.role);
      setDepartment(employee.department);
      setSalary(employee.salary.toString());
      setStatus(employee.status);
    }
  }, [employee]);

  // Update role when department changes
  useEffect(() => {
    if (department && DEPARTMENT_ROLES[department]) {
      const roles = DEPARTMENT_ROLES[department];
      // If current role is not in the new department's roles, reset to first role
      if (role && !roles.includes(role)) {
        setRole(roles[0]);
      }
    }
  }, [department, role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    if (!name.trim() || !email.trim() || !role.trim() || !department.trim() || !salary) return;

    onSave(employee.id, {
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      department: department.trim(),
      salary: parseFloat(salary) || employee.salary,
      status,
    });

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
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Department <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <select
                value={DEPARTMENTS.includes(department as any) ? department : (department ? "Other" : "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "Other") {
                    setDepartment("");
                  } else {
                    setDepartment(val);
                  }
                  setRole(""); // Reset role when department changes
                }}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                required={!department || DEPARTMENTS.includes(department as any)}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value="Other">Other (Type manually)</option>
              </select>
              {(!DEPARTMENTS.includes(department as any) && department) || (department === "" && !DEPARTMENTS.includes(department as any)) ? (
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                  placeholder="Type custom department..."
                  required
                />
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Role / Position <span className="text-red-500">*</span>
            </label>
            {department && DEPARTMENT_ROLES[department as keyof typeof DEPARTMENT_ROLES] ? (
              <div className="flex flex-col gap-2">
                <select
                  value={DEPARTMENT_ROLES[department as keyof typeof DEPARTMENT_ROLES]?.includes(role as any) ? role : (role ? "Other" : "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Other") {
                      setRole("");
                    } else {
                      setRole(val);
                    }
                  }}
                  className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                  required={!role || DEPARTMENT_ROLES[department as keyof typeof DEPARTMENT_ROLES]?.includes(role as any)}
                >
                  <option value="">Select a role...</option>
                  {DEPARTMENT_ROLES[department as keyof typeof DEPARTMENT_ROLES].map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                  <option value="Other">Other (Type manually)</option>
                </select>
                {(!DEPARTMENT_ROLES[department as keyof typeof DEPARTMENT_ROLES]?.includes(role as any) && role) || (role === "" && !DEPARTMENT_ROLES[department as keyof typeof DEPARTMENT_ROLES]?.includes(role as any) && document.activeElement !== null) ? (
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                    placeholder="Type custom role..."
                    required
                  />
                ) : null}
              </div>
            ) : (
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                placeholder="Type custom role..."
                required
              />
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

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "vacation" | "leave" | "pending")}
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
              required
            >
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
