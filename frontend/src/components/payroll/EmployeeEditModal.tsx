/**
 * Employee Edit Modal - edit employee information
 */

import React, { useState, useEffect } from "react";
import { Edit2, Save } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (employeeId: number, updates: Partial<Employee>) => void;
}

export default function EmployeeEditModal({
  isOpen,
  onClose,
  employee,
  onSave,
}: EmployeeEditModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState<"active" | "vacation" | "leave">("active");

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setRole(employee.role);
      setDepartment(employee.department);
      setSalary(employee.salary.toString());
      setStatus(employee.status);
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    onSave(employee.id, {
      name: name.trim(),
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
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
            <label className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Role / Position
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
              required
            >
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Annual Salary
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                $
              </span>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full p-2 pl-7 rounded border border-[var(--border)] bg-[var(--background)]"
                min="0"
                step="1000"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "vacation" | "leave")}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
            >
              <option value="active">Active</option>
              <option value="vacation">On Vacation</option>
              <option value="leave">On Leave</option>
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
