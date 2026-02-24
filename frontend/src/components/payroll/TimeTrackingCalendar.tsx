import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Cake, CheckCircle2, Calendar, Loader2 } from "lucide-react";
import type { Employee, LeaveRecord, CompletedTask } from "@/lib/payroll-calendar/types";
import { fetchTimeEntries } from "@/lib/time-entries";

import DayDetailsModal, { type DayTimeEntry } from "./DayDetailsModal";

interface TimeTrackingCalendarProps {
  employee: Employee | null;
  onAddTimeEntry: (date: string) => void;
}

// ... helper functions omitted for brevity in instruction, but kept in replacement if possible ...

// Helper to get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

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
  const [isFetching, setIsFetching] = useState(false);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch real time entries from API
  useEffect(() => {
    if (!employee) return;

    const fetchEntries = async () => {
      setIsFetching(true);
      try {
        const startOfMonth = new Date(year, month, 1).toISOString();
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

        // Pass employee.id so admins/managers see the selected employee's data
        const res = await fetchTimeEntries(startOfMonth, endOfMonth, String(employee.id));
        setTimeEntries(res);
      } catch (err) {
        console.error("Failed to fetch entries", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchEntries();
  }, [employee, month, year]);

  // Leave records — no mock data; real API to be wired later
  const employeeLeaveRecords = useMemo(() => {
    return [] as ReturnType<typeof Array.prototype.filter>;
  }, []);

  // Calculate total hours and salary for the month
  const { totalHours, monthlySalary } = useMemo(() => {
    if (!employee) return { totalHours: 0, monthlySalary: 0 };

    const hours = timeEntries.reduce((sum, entry) => sum + (entry.durationMin || 0) / 60, 0);
    const salary = employee.salary / 12; // Monthly salary

    return { totalHours: hours, monthlySalary: salary };
  }, [employee, timeEntries, month, year]);

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

  // Get aggregated time entry for a specific date (sums all sessions that day)
  const getTimeEntry = (dateStr: string): DayTimeEntry | null => {
    const dayEntries = timeEntries.filter((e) => e.start.startsWith(dateStr));
    if (dayEntries.length === 0) return null;

    const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.durationMin || 0), 0);

    return {
      date: dateStr,
      type: "work" as const,
      hours: totalMinutes / 60,
      sessions: dayEntries.map((e) => ({
        id: e.id,
        start: e.start,
        end: e.end,
        durationMin: e.durationMin,
      })),
    };
  };

  // Tasks — no mock data; returns empty until real API is wired
  const getTasksForDate = (_dateStr: string): CompletedTask[] => {
    return [];
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
          className={`h-24 md:h-28 ${bgClass} ${borderClass} rounded-xl p-1.5 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 relative group cursor-pointer flex flex-col`}
        >
          {/* Day number + total hours inline */}
          <div className="flex items-center justify-between mb-0.5 flex-shrink-0">
            <span className="text-sm font-medium text-[var(--foreground)]">{day}</span>
            {timeEntry?.hours != null && timeEntry.hours > 0 && (
              <span className="text-[9px] font-bold text-sky-500 dark:text-sky-400">
                {timeEntry.hours.toFixed(1)}h
              </span>
            )}
          </div>

          {/* Per-session IN/OUT markers */}
          {timeEntry?.sessions && timeEntry.sessions.length > 0 && (
            <div className="flex flex-col gap-[2px] flex-1 overflow-hidden">
              {timeEntry.sessions.map((session, idx) => {
                const inTime = new Date(session.start).toLocaleTimeString([], {
                  hour: "2-digit", minute: "2-digit", hour12: false,
                });
                const outTime = session.end
                  ? new Date(session.end).toLocaleTimeString([], {
                    hour: "2-digit", minute: "2-digit", hour12: false,
                  })
                  : null;

                return (
                  <React.Fragment key={session.id}>
                    {idx > 0 && <div className="border-t border-white/10 my-[1px]" />}
                    {/* Clock In */}
                    <div className="flex items-center bg-emerald-600/90 text-white rounded px-1 py-[1px]">
                      <span className="text-[8px] leading-tight font-bold tracking-tight">
                        🟢 {inTime}
                      </span>
                    </div>
                    {/* Clock Out or running */}
                    {outTime ? (
                      <div className="flex items-center bg-red-600/90 text-white rounded px-1 py-[1px]">
                        <span className="text-[8px] leading-tight font-bold tracking-tight">
                          🔴 {outTime}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center bg-emerald-500/50 text-white rounded px-1 py-[1px]">
                        <span className="text-[8px] leading-tight font-semibold animate-pulse">
                          ● running
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Vacation striped pattern */}
          {leaveRecord?.type === "vacation" && filters.vacation && (
            <div className="absolute inset-0 opacity-20 pointer-events-none rounded-xl overflow-hidden">
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
            <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full p-1 shadow-md">
              <Cake className="w-2.5 h-2.5 text-white" />
            </div>
          )}

          {/* Task badge */}
          {tasksForDay.length > 0 && (
            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>{tasksForDay.length}</span>
            </div>
          )}

          {/* Leave indicator — only show if no work hours */}
          {leaveRecord && !timeEntry?.hours && (
            <div className="mt-auto text-xs font-medium text-[var(--muted)]">
              {leaveRecord.type === "vacation" ? "🏖️" : "😷"}
            </div>
          )}

          {/* Hover overlay */}
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
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${filters.workDay
              ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-[var(--muted)] hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
          >
            {filters.workDay && totalHours > 0 && `${totalHours.toFixed(0)} hrs`}
            {!filters.workDay && "Work day"}
          </button>
          <button
            onClick={() => toggleFilter("truancy")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${filters.truancy
              ? "bg-gradient-to-r from-gray-700 to-gray-900 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-[var(--muted)] hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
          >
            Truancy
          </button>
          <button
            onClick={() => toggleFilter("vacation")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${filters.vacation
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
      <div className="relative">
        {isFetching && (
          <div className="absolute inset-0 z-10 bg-[var(--card-bg)]/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        <div className="grid grid-cols-7 gap-x-1 gap-y-0.5">
          {renderCalendar()}
        </div>
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
