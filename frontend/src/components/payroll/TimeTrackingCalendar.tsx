/**
 * Time Tracking Calendar - monthly calendar view with work days, vacation, sick leave
 */

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Cake, Clock, CheckCircle2, Calendar } from "lucide-react";
import type { Employee, TimeEntry, LeaveRecord } from "@/lib/payroll-calendar/types";
import { MOCK_TIME_ENTRIES, MOCK_LEAVE_RECORDS, MOCK_COMPLETED_TASKS } from "@/lib/payroll-calendar/mock-data";
import DayDetailsModal from "./DayDetailsModal";

interface TimeTrackingCalendarProps {
  employee: Employee | null;
  onAddTimeEntry: (date: string) => void;
}

// Helper to get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper to get first day of month (0 = Sunday)
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Helper to format date as YYYY-MM-DD
const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TimeTrackingCalendar({
  employee,
  onAddTimeEntry,
}: TimeTrackingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    workDay: true,
    truancy: true,
    vacation: true,
  });
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [showDayDetails, setShowDayDetails] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get employee's time entries and leave records
  const employeeTimeEntries = useMemo(() => {
    if (!employee) return [];
    return MOCK_TIME_ENTRIES.filter((entry) => entry.employeeId === employee.id);
  }, [employee]);

  const employeeLeaveRecords = useMemo(() => {
    if (!employee) return [];
    return MOCK_LEAVE_RECORDS.filter((record) => record.employeeId === employee.id);
  }, [employee]);

  // Calculate total hours and salary for the month
  const { totalHours, monthlySalary } = useMemo(() => {
    if (!employee) return { totalHours: 0, monthlySalary: 0 };
    
    const monthEntries = employeeTimeEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });

    const hours = monthEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const salary = employee.salary / 12; // Monthly salary

    return { totalHours: hours, monthlySalary: salary };
  }, [employee, employeeTimeEntries, month, year]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Toggle filter
  const toggleFilter = (filterName: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [filterName]: !prev[filterName] }));
  };

  // Check if date is within a leave period
  const getLeaveForDate = (dateStr: string): LeaveRecord | null => {
    return employeeLeaveRecords.find((record) => {
      return dateStr >= record.startDate && dateStr <= record.endDate;
    }) || null;
  };

  // Check if it's employee's birthday
  const isBirthday = (day: number): boolean => {
    if (!employee?.birthday) return false;
    const birthday = new Date(employee.birthday);
    return birthday.getMonth() === month && birthday.getDate() === day;
  };

  // Get time entry for specific date
  const getTimeEntry = (dateStr: string): TimeEntry | null => {
    return employeeTimeEntries.find((entry) => entry.date === dateStr) || null;
  };

  // Get tasks for specific date
  const getTasksForDate = (dateStr: string) => {
    if (!employee) return [];
    return MOCK_COMPLETED_TASKS.filter(
      (task) => task.employeeId === employee.id && task.date === dateStr
    );
  };

  // Handle day click
  const handleDayClick = (dateStr: string) => {
    setSelectedDayDate(dateStr);
    setShowDayDetails(true);
  };

  // Generate calendar grid
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // Adjust for Monday start (0 = Monday)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    // Add empty cells before first day
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days.map((day, index) => {
      if (day === null) {
        return <div key={`empty-${index}`} className="h-16 md:h-20" />;
      }

      const dateStr = formatDate(year, month, day);
      const timeEntry = getTimeEntry(dateStr);
      const leaveRecord = getLeaveForDate(dateStr);
      const tasksForDay = getTasksForDate(dateStr);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const hasBirthday = isBirthday(day);

      // Determine cell background
      let bgClass = "bg-[var(--card-bg)]";
      let borderClass = "border border-[var(--border)]";

      if (isToday) {
        borderClass = "border-2 border-blue-500 dark:border-blue-400 shadow-md";
      }

      if (timeEntry?.type === "work" && filters.workDay) {
        bgClass = "bg-gradient-to-br from-amber-100 to-orange-100 dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm";
      } else if (leaveRecord?.type === "vacation" && filters.vacation) {
        bgClass = "bg-gradient-to-br from-purple-100 to-pink-100 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 dark:text-purple-400 shadow-sm";
        // Striped pattern for vacation
        borderClass += " relative overflow-hidden";
      } else if (leaveRecord?.type === "sick" && filters.truancy) {
        bgClass = "bg-gradient-to-br from-red-100 to-pink-100 dark:bg-gradient-to-br dark:from-red-950/30 dark:to-pink-950/30 shadow-sm";
      }

      return (
        <button
          key={day}
          onClick={() => handleDayClick(dateStr)}
          className={`h-16 md:h-20 ${bgClass} ${borderClass} rounded-xl p-2 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 relative group cursor-pointer`}
        >
          {/* Day number */}
          <div className="text-sm font-medium text-[var(--foreground)]">{day}</div>

          {/* Vacation striped pattern */}
          {leaveRecord?.type === "vacation" && filters.vacation && (
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id={`stripes-${day}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                    <line x1="0" y="0" x2="0" y2="8" stroke="currentColor" strokeWidth="2" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#stripes-${day})`} />
              </svg>
            </div>
          )}

          {/* Birthday indicator */}
          {hasBirthday && (
            <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full p-1.5 shadow-md">
              <Cake className="w-3 h-3 text-white" />
            </div>
          )}

          {/* Badges for hours and tasks */}
          {timeEntry?.hours && timeEntry.hours > 0 && (
            <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-sky-500 dark:from-blue-600 dark:to-sky-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-md">
              <Clock className="w-3 h-3" />
              <span>{timeEntry.hours}h</span>
            </div>
          )}

          {tasksForDay.length > 0 && (
            <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-md">
              <CheckCircle2 className="w-3 h-3" />
              <span>{tasksForDay.length}</span>
            </div>
          )}

          {/* Leave indicator - only show if no work hours */}
          {leaveRecord && !timeEntry?.hours && (
            <div className="absolute bottom-1 left-1 text-xs font-medium text-[var(--muted)]">
              {leaveRecord.type === "vacation" ? "🏖️" : "😷"}
            </div>
          )}

          {/* Hover tooltip */}
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
        </button>
      );
    });
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Calendar className="w-16 h-16 mx-auto text-[var(--muted)] mb-4" />
          <p className="text-sm text-[var(--muted)]">
            Select an employee to view their time tracking calendar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header with hours/salary totals */}
      <div className="mb-3">
        {/* Hours and Salary Display */}
        <div className="text-center mb-3">
          <div className="text-3xl font-bold text-[var(--foreground)]">
            {totalHours.toFixed(2)} hrs / ${monthlySalary.toLocaleString()}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => toggleFilter("workDay")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${
              filters.workDay
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-[var(--muted)] hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {filters.workDay && totalHours > 0 && `${totalHours.toFixed(0)} hrs`}
            {!filters.workDay && "Work day"}
          </button>
          <button
            onClick={() => toggleFilter("truancy")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${
              filters.truancy
                ? "bg-gradient-to-r from-gray-700 to-gray-900 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-[var(--muted)] hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Truancy
          </button>
          <button
            onClick={() => toggleFilter("vacation")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${
              filters.vacation
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-[var(--muted)] hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Vacation
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 hover:from-blue-100 hover:to-sky-100 dark:hover:from-blue-800/30 dark:hover:to-sky-800/30 transition-all shadow-sm hover:shadow-md"
        >
          <ChevronLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
        <div className="text-xl font-bold text-[var(--foreground)]">
          {MONTH_NAMES[month]} {year}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 hover:from-blue-100 hover:to-sky-100 dark:hover:from-blue-800/30 dark:hover:to-sky-800/30 transition-all shadow-sm hover:shadow-md"
        >
          <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-x-1 gap-y-0 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-bold text-[var(--muted)] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-x-1 gap-y-0.5">
        {renderCalendar()}
      </div>

      {/* Day Details Modal */}
      {selectedDayDate && (
        <DayDetailsModal
          isOpen={showDayDetails}
          onClose={() => setShowDayDetails(false)}
          date={selectedDayDate}
          timeEntry={getTimeEntry(selectedDayDate)}
          tasks={getTasksForDate(selectedDayDate)}
          employeeName={employee?.name || ""}
        />
      )}
    </div>
  );
}
