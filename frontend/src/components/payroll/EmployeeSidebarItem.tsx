/**
 * Employee Sidebar Item - compact employee card for sidebar list
 */

import React from "react";
import type { Employee } from "@/lib/payroll-calendar/types";

interface EmployeeSidebarItemProps {
  employee: Employee;
  isSelected: boolean;
  onClick: () => void;
}

export default function EmployeeSidebarItem({
  employee,
  isSelected,
  onClick,
}: EmployeeSidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isSelected
          ? "bg-[var(--accent)] border border-[var(--accent)]"
          : "hover:bg-[var(--card-surface)] border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {employee.avatar}
        </div>

        {/* Name and Role */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm truncate ${
            isSelected ? "text-white" : "text-[var(--foreground)]"
          }`}>
            {employee.name}
          </h4>
          <p className={`text-xs truncate ${
            isSelected ? "text-white/80" : "text-[var(--muted)]"
          }`}>
            {employee.role}
          </p>
        </div>
      </div>

      {/* Progress Bar - 3 segments (work/truancy/vacation) */}
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {/* Work hours - yellow segment */}
        <div
          className="bg-amber-400 rounded-l-full"
          style={{ width: `${employee.performance * 0.4}%` }}
        />
        {/* Active hours - dark segment */}
        <div
          className="bg-gray-600"
          style={{ width: `${employee.performance * 0.35}%` }}
        />
        {/* Remaining - light gray segment */}
        <div
          className="bg-gray-300 rounded-r-full flex-1"
        />
      </div>
    </button>
  );
}
