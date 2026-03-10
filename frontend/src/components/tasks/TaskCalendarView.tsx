"use client";

import React from "react";
import dynamic from "next/dynamic";
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
  onEditTask: (task: Task) => void;
}

export default function TaskCalendarView({
  events,
  todaysTasks,
  overdueTasks,
  totalCount,
  completedCount,
  inProgressCount,
  onEditTask,
}: TaskCalendarViewProps) {
  return (
    <div className="flex-1 overflow-y-auto chat-scroll pr-2 pb-6 space-y-6">
      <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <LazyFullCalendar
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
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
              onEditTask(arg.event.extendedProps.task);
            }
          }}
          dayMaxEvents={3}
          height={600}
        />
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
                  <li
                    key={t.id}
                    onClick={() => onEditTask(t)}
                    className="p-2 border border-[var(--border)] rounded text-sm cursor-pointer hover:bg-[var(--card-bg)]"
                  >
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {t.department?.name}
                    </div>
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
                  <li
                    key={t.id}
                    onClick={() => onEditTask(t)}
                    className="p-2 border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded text-sm cursor-pointer"
                  >
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-[var(--status-blocked)]">
                      Due: {t.dueDate}
                    </div>
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
