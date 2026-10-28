import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Cake, CheckCircle2, Calendar, Loader2 } from "lucide-react";
import type { Employee, LeaveRecord } from "@/lib/payroll-calendar/types";
import { fetchTimeEntriesOrThrow, type TimeEntry } from "@/lib/time-entries";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import { hasManagementAccess } from "@/lib/role-access";
import type { DayTask } from "@/lib/types/api";
import {
  manilaDayBounds,
  manilaDayKey,
  manilaTimeInput,
  manilaTodayKey,
  monthDayKeysFor,
  shiftMonth,
} from "@/lib/payroll-dates";
import { getCalendarPayHeader } from "@/lib/pay-basis";
import { findScheme } from "@/lib/payroll-options";
import { usePayrollProfile, usePayrollSchemes } from "./usePayrollOptions";

import DayDetailsModal, { type DayTimeEntry } from "./DayDetailsModal";

/** Shape of a task as returned by GET /tasks/assignee/:id */
interface RawApiTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  updatedAt?: string;
  department?: { name: string };
}


interface TimeTrackingCalendarProps {
  employee: Employee | null;
  onAddTimeEntry: (date: string) => void;
  onDeleteTimeEntry?: (id: string) => void;
  refreshKey?: number;
}

// Calendar math on year / month numbers (month 0 to 11) in UTC, so the browser zone never shifts a day.
const getDaysInMonth = (year: number, month: number) => {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
};

const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Clock time (24 hour) in the payroll timezone (Manila), whatever the browser zone is. */
const formatClockTime = (iso: string) => manilaTimeInput(iso) ?? "";

/** The Manila month (month 0 to 11) that contains today. */
function currentManilaMonth(): { year: number; month: number } {
  const [year, month] = manilaTodayKey().split("-").map(Number);
  return { year, month: month - 1 };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TimeTrackingCalendar({
  employee,
  onDeleteTimeEntry,
  refreshKey = 0,
}: TimeTrackingCalendarProps) {
  const toast = useToast();
  const { user } = useUser();
  // GET /tasks/assignee/:id is for management roles or your own tasks
  // (backend canRequestAssigneeTasks); payroll-only roles skip it.
  const canViewTasks = Boolean(employee) && (
    hasManagementAccess(user) || (user?.id != null && String(user.id) === String(employee?.id))
  );
  const [viewMonth, setViewMonth] = useState(currentManilaMonth);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<RawApiTask[]>([]);
  // Pay settings from GET /payroll/config/:userId (the employee list leaves out the hourly
  // rate); refetched after Set Up Payroll saves, and the scheme names from the managed list.
  const { data: payProfile } = usePayrollProfile(employee ? String(employee.id) : null);
  const { data: schemes } = usePayrollSchemes(Boolean(employee));

  const { year, month } = viewMonth;
  const employeeId = employee ? String(employee.id) : null;

  // Time entries (required) and completed tasks (optional) for the month shown.
  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    const fetchData = async () => {
      setIsFetching(true);
      // Whole Manila days of the month; entries are bucketed by Manila day below.
      const days = monthDayKeysFor(year, month + 1);
      const [entriesResult, tasksResult] = await Promise.allSettled([
        fetchTimeEntriesOrThrow(manilaDayBounds(days.start)?.startIso, manilaDayBounds(days.end)?.endIso, employeeId),
        canViewTasks
          ? apiFetch(`/tasks/assignee/${employeeId}`).then((res) => res.json() as Promise<RawApiTask[]>)
          : Promise.resolve([] as RawApiTask[]),
      ]);
      if (cancelled) return;
      if (entriesResult.status === "fulfilled") {
        setTimeEntries(entriesResult.value);
      } else {
        // Never leave another month's or person's hours on screen after a failure.
        setTimeEntries([]);
        toast.error("Failed to load calendar data");
      }
      // The task list only adds badges: a refusal or failure leaves it empty, never the calendar.
      setTasks(tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value : []);
      setIsFetching(false);
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [employeeId, canViewTasks, month, year, refreshKey, toast]);


  // Leave records — no mock data; real API to be wired later
  const employeeLeaveRecords = useMemo(() => {
    return [] as ReturnType<typeof Array.prototype.filter>;
  }, []);

  // Logged hours for the month, and per Manila day of the entry start (as the server buckets them).
  const { totalHours, dailyHours } = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of timeEntries) {
      const day = manilaDayKey(entry.start) ?? entry.start;
      byDay.set(day, (byDay.get(day) ?? 0) + (entry.durationMin || 0) / 60);
    }
    const days = [...byDay.values()];
    return { totalHours: days.reduce((sum, hours) => sum + hours, 0), dailyHours: days };
  }, [timeEntries]);

  // Until the profile loads the header falls back to the employee list.
  const scheme = findScheme(schemes, payProfile?.payrollScheme ?? employee?.payrollScheme);
  const payBasis = payProfile?.payBasis ?? employee?.payBasis;
  const payHeader = getCalendarPayHeader({
    payBasis,
    baseSalary: payProfile?.baseSalary ?? employee?.salary,
    hourlyRate: payProfile?.hourlyRate,
    maxBillableHoursPerDay: payProfile?.maxBillableHoursPerDay ?? employee?.maxBillableHoursPerDay,
    schemeName: scheme?.name,
    maxCreditedDays: scheme?.maxCreditedDays,
    dailyHours,
  });
  // A fixed monthly salary is paid whatever the hours; the scheme only prices
  // overtime, so the header names the basis (the payslip line says the same).
  const payLabel = payHeader.label;

  const moveMonth = (delta: number) => {
    const next = shiftMonth(year, month + 1, delta);
    setViewMonth({ year: next.year, month: next.month - 1 });
  };
  const handlePrevMonth = () => moveMonth(-1);
  const handleNextMonth = () => moveMonth(1);


  // Check if date is within a leave period
  const getLeaveForDate = (dateStr: string): LeaveRecord | null => {
    return employeeLeaveRecords.find((record) => {
      return dateStr >= record.startDate && dateStr <= record.endDate;
    }) || null;
  };

  // Birthday as "MM-DD"; a date-only birthday is that day, never UTC midnight shown in the browser zone.
  const birthdayMonthDay = manilaDayKey(employee?.birthday)?.slice(5) ?? null;
  const isBirthday = (day: number): boolean =>
    birthdayMonthDay === formatDate(year, month, day).slice(5);

  // Get aggregated time entry for a specific date (sums all sessions that day)
  const getTimeEntry = (dateStr: string): DayTimeEntry | null => {
    // Bucket by the Manila day of the entry start, like the server does.
    const dayEntries = timeEntries.filter((e) => manilaDayKey(e.start) === dateStr);
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

  // Tasks — show real tasks from API
  const getTasksForDate = (dateStr: string): DayTask[] => {
    return tasks
      .filter((t) => t.status === "completed" && manilaDayKey(t.dueDate) === dateStr)
      .map(t => ({
        id: t.id,
        title: t.title,
        completedDate: t.dueDate || t.updatedAt,
        category: t.department?.name || employee?.department || "Operations",
      }));
  };

  // Handle day click
  const handleDayClick = (dateStr: string) => {
    setSelectedDayDate(dateStr);
    setShowDayDetails(true);
  };

  // Generate calendar grid
  const todayKey = manilaTodayKey();
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
      const isToday = todayKey === dateStr;
      const hasBirthday = isBirthday(day);

      // Determine cell background
      let bgClass = "bg-[var(--card-bg)]";
      let borderClass = "border border-[var(--border)]";

      if (isToday) {
        borderClass = "border-2 border-blue-500 dark:border-blue-400 shadow-md";
      }

      if (timeEntry?.type === "work") {
        bgClass = "bg-gradient-to-br from-amber-100 to-orange-100 dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm";
      } else if (leaveRecord?.type === "vacation") {
        bgClass = "bg-gradient-to-br from-purple-100 to-pink-100 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 dark:text-purple-400 shadow-sm";
        // Striped pattern for vacation
        borderClass += " relative overflow-hidden";
      } else if (leaveRecord?.type === "sick") {
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
              <span className="text-[11px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {timeEntry.hours.toFixed(1)}h
              </span>
            )}
          </div>

          {/* Per-session IN/OUT markers */}
          {timeEntry?.sessions && timeEntry.sessions.length > 0 && (
            <div className="flex flex-col gap-[2px] flex-1 overflow-hidden">
              {timeEntry.sessions.map((session, idx) => {
                const inTime = formatClockTime(session.start);
                const outTime = session.end ? formatClockTime(session.end) : null;

                return (
                  <React.Fragment key={session.id}>
                    {idx > 0 && <div className="border-t border-white/10 my-[1px]" />}
                    {/* Clock In */}
                    <div className="flex items-center bg-emerald-600/90 text-white rounded px-1 py-[1px]">
                      <span className="text-[11px] leading-tight font-bold tabular-nums">
                        🟢 {inTime}
                      </span>
                    </div>
                    {/* Clock Out or running */}
                    {outTime ? (
                      <div className="flex items-center bg-red-600/90 text-white rounded px-1 py-[1px]">
                        <span className="text-[11px] leading-tight font-bold tabular-nums">
                          🔴 {outTime}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center bg-emerald-500/50 text-white rounded px-1 py-[1px]">
                        <span className="text-[11px] leading-tight font-semibold animate-pulse">
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
          {leaveRecord?.type === "vacation" && (
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
            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-1.5 py-0.5 rounded text-[11px] font-bold shadow">
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
        <div className="text-center mb-3 flex flex-col items-center">
          <div className="text-3xl font-bold text-[var(--foreground)]">
            {totalHours.toFixed(2)} hrs
            {payHeader.amount !== null && <> / ₱{payHeader.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1 font-medium">
            ({payLabel})
          </div>
        </div>

      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 hover:from-blue-100 hover:to-sky-100 dark:hover:from-blue-800/30 dark:hover:to-sky-800/30 transition-all shadow-sm hover:shadow-md"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
        <div className="text-xl font-bold text-[var(--foreground)]">
          {MONTH_NAMES[month]} {year}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 hover:from-blue-100 hover:to-sky-100 dark:hover:from-blue-800/30 dark:hover:to-sky-800/30 transition-all shadow-sm hover:shadow-md"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>

      {/* Day cells keep at least 72 px each (fits 1280 px without scrolling); narrower columns scroll sideways instead of squeezing. */}
      <div className="overflow-x-auto">
        <div className="min-w-[33rem]">
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
          tasksHiddenNote={canViewTasks ? undefined : "Completed tasks are shown to managers."}
          employeeName={employee?.name || ""}
          onDeleteSession={onDeleteTimeEntry}
        />
      )}
    </div>
  );
}
