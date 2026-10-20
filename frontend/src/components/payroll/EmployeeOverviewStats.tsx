/** Stat row above the Employee Overview lists (moved out of EmployeeOverviewTab, 2026-10-20). */

import React from "react";
import { Award, Clock, User, UserPlus, Users } from "lucide-react";
import StatCard from "./StatCard";
import type { Employee } from "@/lib/payroll-calendar/types";

interface EmployeeOverviewStatsProps {
  view: "deployed" | "pending";
  employees: Employee[];
  pendingEmployees: Employee[];
}

export default function EmployeeOverviewStats({ view, employees, pendingEmployees }: EmployeeOverviewStatsProps) {
  if (view === "pending") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<UserPlus className="h-5 w-5" aria-hidden="true" />} label="Pending Applications" value={pendingEmployees.length} bgColor="bg-orange-500" />
        <StatCard icon={<Clock className="h-5 w-5" aria-hidden="true" />} label="Awaiting Review" value={pendingEmployees.filter((emp) => emp.appliedDate).length} bgColor="bg-blue-500" />
        <StatCard icon={<Users className="h-5 w-5" aria-hidden="true" />} label="Total Deployed" value={employees.length} bgColor="bg-emerald-500" />
      </div>
    );
  }

  const avgHours = Math.round(
    employees.length > 0 ? employees.reduce((total, emp) => total + emp.hoursThisWeek, 0) / employees.length : 0,
  );
  const tracked = employees.map((emp) => emp.performance).filter((value): value is number => typeof value === "number");
  const avgPerformance = tracked.length > 0 ? Math.round(tracked.reduce((total, value) => total + value, 0) / tracked.length) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Users className="h-5 w-5" aria-hidden="true" />} label="Total Employees" value={employees.length} bgColor="bg-blue-500" />
      <StatCard
        icon={<User className="h-5 w-5" aria-hidden="true" />}
        label="Verified"
        value={employees.filter((emp) => emp.status === "active" || emp.status === "verified").length}
        bgColor="bg-emerald-500"
      />
      <StatCard icon={<Clock className="h-5 w-5" aria-hidden="true" />} label="Avg Hours/Week" value={avgHours} bgColor="bg-amber-500" />
      <StatCard
        icon={<Award className="h-5 w-5" aria-hidden="true" />}
        label="Avg Performance"
        value={avgPerformance === null ? "Not tracked" : `${avgPerformance}%`}
        bgColor="bg-purple-500"
      />
    </div>
  );
}
