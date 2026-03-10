/**
 * Day Details Modal - shows hours worked and tasks completed for a specific day
 * Reads real clock-in/out data from the TimeEntry sessions for that day.
 */

import React from "react";
import { Clock, CheckCircle2, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import type { DayTask } from "@/lib/types/api";
import type { CompletedTask } from "@/lib/payroll-calendar/types";

/** One session row (from the actual backend TimeEntry) */
export interface DayTimeSession {
  id: string;
  start: string;        // ISO string
  end?: string;         // ISO string — undefined if still running
  durationMin?: number; // server-calculated minutes
}

/** Aggregated summary passed to the modal */
export interface DayTimeEntry {
  date: string;
  type: "work" | "leave" | "sick";
  hours: number;          // total hours for the day
  sessions: DayTimeSession[];
}

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  timeEntry: DayTimeEntry | null;
  tasks: DayTask[];
  employeeName: string;
  onDeleteSession?: (id: string) => void;
}

// Format an ISO string to a readable time e.g. "09:32 AM"
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Format minutes to "Xh Ym"
function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  timeEntry,
  tasks,
  employeeName,
  onDeleteSession,
}: DayDetailsModalProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const hasSessions = timeEntry && timeEntry.sessions.length > 0;

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
            {hasSessions ? (
              <div className="space-y-3">
                {timeEntry!.sessions.map((session, i) => {
                  const sessionMinutes =
                    session.durationMin ??
                    (session.end
                      ? Math.round(
                        (new Date(session.end).getTime() -
                          new Date(session.start).getTime()) /
                        60000
                      )
                      : null);

                  return (
                    <div key={session.id} className="space-y-1.5">
                      {timeEntry!.sessions.length > 1 && (
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          Session {i + 1}
                        </p>
                      )}
                      <div className="flex justify-between items-center group/row">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[var(--muted)]">Clock In:</span>
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {fmtTime(session.start)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[var(--muted)]">Clock Out:</span>
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {session.end ? fmtTime(session.end) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                                  Currently clocked in
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {onDeleteSession && (
                          <button
                            onClick={() => onDeleteSession(session.id)}
                            className="ml-4 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100"
                            title="Delete this session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {sessionMinutes != null && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[var(--muted)]">Duration:</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {fmtDuration(sessionMinutes)}
                          </span>
                        </div>
                      )}
                      {i < timeEntry!.sessions.length - 1 && (
                        <hr className="border-blue-200 dark:border-blue-800/40 mt-2" />
                      )}
                    </div>
                  );
                })}

                {/* Total row (only if multiple sessions) */}
                {timeEntry!.sessions.length > 1 && (
                  <div className="pt-2 mt-2 border-t-2 border-blue-200 dark:border-blue-800/40">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Total Hours:
                      </span>
                      <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                        {timeEntry!.hours.toFixed(2)}h
                      </span>
                    </div>
                  </div>
                )}
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
              {timeEntry?.hours != null ? timeEntry.hours.toFixed(1) : "0"}h
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
