"use client";

import React from "react";
import dynamic from "next/dynamic";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/lib/tasks";
import type { CalendarEvent } from "@/lib/types/api";

const LazyFullCalendar = dynamic(
  () => import("@/components/ui/LazyFullCalendar"),
  { ssr: false }
);

interface TaskCalendarViewProps {
  events: CalendarEvent[];
  todaysTasks: Task[];
  overdueTasks: Task[];
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  onOpenTask: (task: Task) => void;
  onCreateTaskForDate?: (date: string) => void;
}

function getMonthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMonthInputValue(dateString: string): string {
  return dateString.slice(0, 7);
}

function getMonthLabel(dateString: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function shiftMonth(dateString: string, delta: number): string {
  const nextDate = new Date(`${dateString}T00:00:00`);
  nextDate.setMonth(nextDate.getMonth() + delta);
  return getMonthStart(nextDate);
}

export default function TaskCalendarView({
  events,
  todaysTasks,
  overdueTasks,
  totalCount,
  completedCount,
  inProgressCount,
  onOpenTask,
  onCreateTaskForDate,
}: TaskCalendarViewProps) {
  const [calendarMonth, setCalendarMonth] = React.useState(() => getMonthStart());

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Calendar Navigation</div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              Click a date to create a task due on that day.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <label className="sr-only" htmlFor="task-calendar-month">Calendar month</label>
            <input
              id="task-calendar-month"
              type="month"
              value={getMonthInputValue(calendarMonth)}
              onChange={(event) => {
                if (event.target.value) setCalendarMonth(`${event.target.value}-01`);
              }}
              className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCalendarMonth(getMonthStart())}
              className="min-h-10 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Today
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
          <CalendarPlus className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <span>Viewing {getMonthLabel(calendarMonth)}</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--card-bg)] p-4 chat-scroll">
        <div className="min-w-[42rem] md:min-w-0">
          <LazyFullCalendar
            key={calendarMonth}
            initialView="dayGridMonth"
            initialDate={calendarMonth}
            headerToolbar={{
              left: "",
              center: "title",
              right: "dayGridMonth,dayGridWeek,dayGridDay",
            }}
            events={events}
            eventContent={(arg) => {
              const task = arg.event.extendedProps.task;
              const statusDot: Record<string, string> = {
                todo: "#6b7280",
                in_progress: "#3b82f6",
                review: "#f59e0b",
                completed: "#10b981",
              };
              return (
                <div className="flex items-center gap-1 px-1.5 py-0.5 w-full overflow-hidden">
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: statusDot[task?.status] || "#6b7280",
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span className="text-[10px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                    {arg.event.title}
                  </span>
                </div>
              );
            }}
            eventClick={(arg) => {
              if (arg.event.extendedProps.task) {
                onOpenTask(arg.event.extendedProps.task);
              }
            }}
            dateClick={(arg) => {
              onCreateTaskForDate?.(arg.dateStr);
            }}
            dayMaxEvents={3}
            height={600}
          />
        </div>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex justify-between">
            <div className="text-sm font-semibold">Due Today</div>
            <div className="text-xs text-[var(--muted)]">
              {todaysTasks.length}
            </div>
          </div>
          <div className="p-3">
            {todaysTasks.length === 0 ? (
              <div className="text-xs text-[var(--muted)] text-center py-4">
                No tasks due today
              </div>
            ) : (
              <ul className="space-y-2">
                {todaysTasks.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTask(t)}
                      className="w-full rounded border border-[var(--border)] p-2 text-left text-sm transition-colors hover:bg-[var(--card-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {t.department?.name}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex justify-between">
            <div className="text-sm font-semibold text-[var(--status-blocked)]">
              Overdue
            </div>
            <div className="text-xs text-[var(--muted)]">
              {overdueTasks.length}
            </div>
          </div>
          <div className="p-3">
            {overdueTasks.length === 0 ? (
              <div className="text-xs text-[var(--muted)] text-center py-4">
                No overdue tasks
              </div>
            ) : (
              <ul className="space-y-2">
                {overdueTasks.slice(0, 3).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTask(t)}
                      className="w-full rounded border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] p-2 text-left text-sm transition-colors hover:bg-[var(--status-blocked-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--status-blocked)]"
                    >
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-[var(--status-blocked)]">
                        Due: {t.dueDate}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)]">
            <div className="text-sm font-semibold">Overview</div>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3">
            <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
              <div className="text-lg font-bold">{totalCount}</div>
              <div className="text-xs text-[var(--muted)]">Total</div>
            </div>
            <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
              <div className="text-lg font-bold text-[var(--status-completed)]">
                {completedCount}
              </div>
              <div className="text-xs text-[var(--muted)]">Done</div>
            </div>
            <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
              <div className="text-lg font-bold text-[var(--status-in-progress)]">
                {inProgressCount}
              </div>
              <div className="text-xs text-[var(--muted)]">Active</div>
            </div>
            <div className="p-2 bg-[var(--card-bg)] rounded border border-[var(--border)] text-center">
              <div className="text-lg font-bold text-[var(--status-blocked)]">
                {overdueTasks.length}
              </div>
              <div className="text-xs text-[var(--muted)]">Overdue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
