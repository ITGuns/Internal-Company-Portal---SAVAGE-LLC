/**
 * Employee card component for displaying employee information
 */

import React, { useState } from "react";
import { TrendingUp, Trash2, Check, Plane, Coffee } from "lucide-react";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";

interface EmployeeCardProps {
  employee: Employee;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function EmployeeCard({
  employee,
  onViewDetails,
  onEdit,
  onDelete,
}: EmployeeCardProps) {
  return (
    <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden border border-[var(--border)]">
          {employee.avatar && (employee.avatar.startsWith('http') || employee.avatar.startsWith('/')) ? (
            <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
          ) : (
            <span>{employee.avatar}</span>
          )}
        </div>

        {/* Employee Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-[var(--foreground)] truncate">
                {employee.name}
              </h3>
              <p className="text-xs text-[var(--muted)] truncate">
                {employee.role}
              </p>
            </div>
            {/* Improved Status Badge */}
            {(employee.status === "active" || employee.status === "verified") && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 shadow-sm">
                <Check className="w-3 h-3" />
                <span>Verified</span>
              </div>
            )}
            {employee.status === "vacation" && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800 shadow-sm">
                <Plane className="w-3 h-3" />
                <span>On Vacation</span>
              </div>
            )}
            {employee.status === "leave" && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 shadow-sm">
                <Coffee className="w-3 h-3" />
                <span>On Leave</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-3 space-y-2">
            {/* Hours This Week */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Hours This Week</span>
              <span className="font-medium">{employee.hoursThisWeek}h</span>
            </div>

            {/* Performance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Performance</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="font-medium">{employee.performance}%</span>
              </div>
            </div>

            {/* Salary Display Section - Optimized for Monthly PHP */}
            <div className="pt-2 border-t border-[var(--border)] mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--muted)]">Monthly Salary</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">PHP</span>
              </div>

              <div className="flex items-center">
                <span className="text-lg font-bold text-[var(--foreground)]">
                  ₱{employee.salary.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-[var(--muted)] ml-1.5 font-medium italic">/ month</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              View Details
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
