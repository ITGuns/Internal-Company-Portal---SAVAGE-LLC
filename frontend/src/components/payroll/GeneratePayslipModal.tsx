/**
 * Generate Payslip Modal - form for creating new payslips
 */

import React, { useState, useEffect } from "react";
import { DollarSign, Save, Plus, X } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { Deduction, Employee } from "@/lib/payroll-calendar/types";

interface GeneratePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (payslipData: {
    employeeId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    hoursWorked: number;
    grossPay: number;
    deductions: Deduction[];
    netPay: number;
  }) => void;
  selectedEmployee?: Employee | null;
  employees: Employee[];
}

export default function GeneratePayslipModal({
  isOpen,
  onClose,
  onGenerate,
  selectedEmployee,
  employees,
}: GeneratePayslipModalProps) {
  // Initialize dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [employeeId, setEmployeeId] = useState<string>(selectedEmployee?.id?.toString() || "");

  // Fallback to first employee if none selected
  useEffect(() => {
    if (selectedEmployee) {
      setEmployeeId(selectedEmployee.id.toString());
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id.toString());
    }
  }, [selectedEmployee, employees]);

  const [payPeriodStart, setPayPeriodStart] = useState(firstDay.toISOString().split("T")[0]);
  const [payPeriodEnd, setPayPeriodEnd] = useState(lastDay.toISOString().split("T")[0]);
  const [hoursWorked, setHoursWorked] = useState("168");

  const employee = employees.find((e) => e.id.toString() === employeeId);
  const monthlySalary = employee ? employee.salary / 12 : 0;

  const deductions: Omit<Deduction, "id">[] = [
    { type: "tax", name: "Federal Tax", amount: Math.round((monthlySalary * 15) / 100), percentage: 15 },
    { type: "insurance", name: "Health Insurance", amount: 250 },
  ];

  const [customDeductions, setCustomDeductions] = useState<Omit<Deduction, "id">[]>([]);

  const addDeduction = () => {
    setCustomDeductions([
      ...customDeductions,
      { type: "other", name: "", amount: 0 },
    ]);
  };

  const removeDeduction = (index: number) => {
    setCustomDeductions(customDeductions.filter((_, i) => i !== index));
  };

  const updateDeduction = (
    index: number,
    field: keyof Omit<Deduction, "id">,
    value: string | number
  ) => {
    setCustomDeductions(
      customDeductions.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      )
    );
  };

  const allDeductions = [...deductions, ...customDeductions];
  const finalTotalDeductions = allDeductions.reduce((sum, d) => sum + d.amount, 0);
  const finalNetPay = monthlySalary - finalTotalDeductions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) return;

    onGenerate({
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      hoursWorked: parseFloat(hoursWorked) || 0,
      grossPay: monthlySalary,
      deductions: allDeductions.map((d, i) => ({ ...d, id: `ded${i}` })),
      netPay: finalNetPay,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Payslip" size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-semibold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Generate Payslip
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Create a new payslip for an employee
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
              Employee <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id.toString()}>
                  {emp.name} - {emp.role}
                </option>
              ))}
            </select>
          </div>

          {/* Pay Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Period Start <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="date"
                value={payPeriodStart}
                onChange={(e) => setPayPeriodStart(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Period End <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="date"
                value={payPeriodEnd}
                onChange={(e) => setPayPeriodEnd(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>
          </div>

          {/* Hours Worked */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)] flex justify-between">
              <span>Hours Worked</span>
              <span className="text-[10px] text-blue-500 font-normal">Calculated from Daily Logs & Timers</span>
            </label>
            <input
              type="number"
              value={hoursWorked}
              readOnly
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--card-surface)] text-[var(--muted)] cursor-not-allowed focus:outline-none"
              min="0"
              step="0.5"
            />
          </div>

          {/* Gross Pay */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Gross Pay (Monthly)
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ${monthlySalary.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Deductions</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={addDeduction}
              >
                Add Deduction
              </Button>
            </div>

            <div className="space-y-2">
              {allDeductions.map((deduction, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <select
                    value={deduction.type}
                    onChange={(e) =>
                      updateDeduction(index, "type", e.target.value)
                    }
                    className="p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    required
                  >
                    <option value="tax">Tax</option>
                    <option value="insurance">Insurance</option>
                    <option value="retirement">Retirement</option>
                    <option value="other">Other</option>
                  </select>

                  <input
                    type="text"
                    value={deduction.name}
                    onChange={(e) =>
                      updateDeduction(index, "name", e.target.value)
                    }
                    placeholder="Deduction name"
                    className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-[var(--muted)]"
                    required
                  />

                  <input
                    type="number"
                    value={deduction.amount}
                    onChange={(e) =>
                      updateDeduction(index, "amount", Number(e.target.value))
                    }
                    placeholder="Amount"
                    className="w-24 p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-[var(--muted)]"
                    min="0"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => removeDeduction(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Deduc tions */}
            <div className="mt-2 p-2 rounded bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
              <span className="text-sm font-medium">Total Deductions</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                -${finalTotalDeductions.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Net Pay */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[var(--foreground)]">
                Net Pay
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${finalNetPay.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
            >
              Generate Payslip
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
