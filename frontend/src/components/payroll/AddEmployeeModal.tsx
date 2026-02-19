/**
 * Add Employee Modal - form for adding new employees
 */

import React, { useState } from "react";
import { UserPlus, Save } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";
import { DEPARTMENTS, DEPARTMENT_ROLES } from "@/lib/departments";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (employee: Omit<Employee, "id">) => void;
}

// Generate avatar initials from name
const getAvatarInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function AddEmployeeModal({
  isOpen,
  onClose,
  onAdd,
}: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState<"active" | "vacation" | "leave" | "pending">("pending");

  // Get available roles for selected department
  const availableRoles = DEPARTMENT_ROLES[department] || [];

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("");
    setDepartment(DEPARTMENTS[0]);
    setSalary("");
    setStatus("active");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      return;
    }
    if (!role.trim()) {
      return;
    }
    if (!salary || parseFloat(salary) <= 0) {
      return;
    }

    const newEmployee: Omit<Employee, "id"> = {
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      department: department.trim(),
      salary: parseFloat(salary),
      status,
      hoursThisWeek: 0, // Will be calculated from time tracking
      performance: 0, // Will be calculated from completed tasks
      avatar: getAvatarInitials(name),
    };

    onAdd(newEmployee);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Add New Employee"
      size="md"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center text-white font-semibold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Add New Employee
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Enter employee information
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
              className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
              placeholder="e.g., John Smith"
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
              placeholder="e.g., john.smith@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Role / Position <span className="text-red-500">*</span>
            </label>
            {availableRoles.length > 0 ? (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                required
              >
                <option value="">Select a role...</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                placeholder="e.g., Custom Role"
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setRole(""); // Reset role when department changes
                }}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                required
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "vacation" | "leave" | "pending")}
                className="w-full p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
              >
                <option value="pending">Pending Approval</option>
                <option value="active">Active</option>
                <option value="vacation">On Vacation</option>
                <option value="leave">On Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
              Annual Salary <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-semibold">
                $
              </span>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full p-3 pl-8 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                placeholder="75000"
                min="0"
                step="1000"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
            >
              Add Employee
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
