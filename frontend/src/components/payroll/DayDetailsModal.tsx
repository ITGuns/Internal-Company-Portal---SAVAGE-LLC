/**
 * Day Details Modal - shows hours worked and tasks completed for a specific day
 */

import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import Modal from "@/components/Modal";
import type { TimeEntry, CompletedTask } from "@/lib/payroll-calendar/types";

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  timeEntry: TimeEntry | null;
  tasks: CompletedTask[];
  employeeName: string;
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  timeEntry,
  tasks,
  employeeName,
}: DayDetailsModalProps) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Day Details" size="md">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">
            {formatDate(date)}
          </h2>
          <p className="text-sm text-[var(--muted)]">{employeeName}</p>
        </div>

        {/* Hours Worked Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Hours Worked This Day
            </h3>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800/40 shadow-sm">
            {timeEntry && timeEntry.type === "work" ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted)]">Clock In:</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {timeEntry.clockIn}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted)]">Clock Out:</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {timeEntry.clockOut}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      Total Hours:
                    </span>
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                      {timeEntry.hours}h
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)] text-center py-2">
                No work hours recorded for this day
              </p>
            )}
          </div>
        </div>

        {/* Tasks Completed Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Tasks Completed
            </h3>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm overflow-hidden">
            {tasks.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 hover:bg-white/60 dark:hover:bg-[var(--card-bg)] transition-all">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {task.title}
                        </p>
                        {task.category && (
                          <span className="inline-block mt-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/40 dark:to-pink-900/40 dark:text-purple-300 shadow-sm">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)] text-center py-4">
                No tasks completed for this day
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-100 via-purple-100 to-emerald-100 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-emerald-950/40 rounded-xl border-2 border-blue-200 dark:border-blue-800/40 shadow-lg">
          <div className="text-center flex-1">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
              {timeEntry?.hours || 0}h
            </div>
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mt-1">Total Hours</div>
          </div>
          <div className="w-px h-14 bg-gradient-to-b from-transparent via-blue-300 dark:via-blue-700 to-transparent" />
          <div className="text-center flex-1">
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              {tasks.length}
            </div>
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-1">Tasks Done</div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium hover:from-red-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
