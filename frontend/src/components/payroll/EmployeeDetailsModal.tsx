/**
 * Employee Details Modal - shows completed tasks for an employee
 */

import React from "react";
import { CheckCircle2, Calendar, Clock } from "lucide-react";
import Modal from "@/components/Modal";
import type { Employee } from "@/lib/payroll-calendar/types";

interface CompletedTask {
  id: string;
  title: string;
  completedDate: string;
  department: string;
  hoursSpent?: number;
  priority: "Low" | "Med" | "High";
}

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

// Mock completed tasks for demo - in production, fetch from API
const MOCK_COMPLETED_TASKS: Record<number, CompletedTask[]> = {
  1: [
    {
      id: "t1",
      title: "Design System Component Library",
      completedDate: "2026-02-10",
      department: "Frontend",
      hoursSpent: 8,
      priority: "High",
    },
    {
      id: "t2",
      title: "Payment Gateway Integration",
      completedDate: "2026-02-08",
      department: "Frontend",
      hoursSpent: 12,
      priority: "High",
    },
    {
      id: "t3",
      title: "User Dashboard Optimization",
      completedDate: "2026-02-05",
      department: "Frontend",
      hoursSpent: 6,
      priority: "Med",
    },
  ],
  2: [
    {
      id: "t4",
      title: "API Rate Limiting Implementation",
      completedDate: "2026-02-11",
      department: "Backend",
      hoursSpent: 10,
      priority: "High",
    },
    {
      id: "t5",
      title: "Database Migration Scripts",
      completedDate: "2026-02-07",
      department: "Backend",
      hoursSpent: 5,
      priority: "Med",
    },
  ],
  3: [
    {
      id: "t6",
      title: "Employee Performance Report",
      completedDate: "2026-02-12",
      department: "HR",
      hoursSpent: 4,
      priority: "Med",
    },
    {
      id: "t7",
      title: "Benefits Package Review",
      completedDate: "2026-02-06",
      department: "HR",
      hoursSpent: 3,
      priority: "Low",
    },
  ],
  4: [
    {
      id: "t8",
      title: "Monthly Financial Statements",
      completedDate: "2026-02-09",
      department: "Finance",
      hoursSpent: 7,
      priority: "High",
    },
  ],
  5: [
    {
      id: "t9",
      title: "Marketing Campaign Strategy",
      completedDate: "2026-02-11",
      department: "Marketing",
      hoursSpent: 5,
      priority: "Med",
    },
  ],
  6: [
    {
      id: "t10",
      title: "Product Roadmap Planning",
      completedDate: "2026-02-10",
      department: "Product",
      hoursSpent: 6,
      priority: "High",
    },
  ],
};

const PRIORITY_COLORS = {
  Low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Med: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function EmployeeDetailsModal({
  isOpen,
  onClose,
  employee,
}: EmployeeDetailsModalProps) {
  if (!employee) return null;

  const completedTasks = MOCK_COMPLETED_TASKS[employee.id] || [];
  const totalHoursOnTasks = completedTasks.reduce(
    (acc, task) => acc + (task.hoursSpent || 0),
    0
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`${employee.name} - Employee Details`}
      size="lg"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center text-white font-semibold text-xl">
            {employee.avatar}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              {employee.name}
            </h2>
            <p className="text-sm text-[var(--muted)]">{employee.role}</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {employee.department}
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-surface)]">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Completed</span>
            </div>
            <div className="text-2xl font-bold">
              {completedTasks.length}
            </div>
            <div className="text-xs text-[var(--muted)]">Tasks</div>
          </div>

          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-surface)]">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Hours</span>
            </div>
            <div className="text-2xl font-bold">{totalHoursOnTasks}h</div>
            <div className="text-xs text-[var(--muted)]">On Tasks</div>
          </div>

          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-surface)]">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">This Week</span>
            </div>
            <div className="text-2xl font-bold">{employee.hoursThisWeek}h</div>
            <div className="text-xs text-[var(--muted)]">Total</div>
          </div>
        </div>

        {/* Completed Tasks List */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Completed Tasks
          </h3>

          {completedTasks.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No completed tasks yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto chat-scroll">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <h4 className="font-medium text-sm">
                          {task.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.completedDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>

                        {task.hoursSpent && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.hoursSpent}h
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--card-surface)]">
                          {task.department}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                        PRIORITY_COLORS[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
