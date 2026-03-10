"use client";

import React from "react";
import Image from 'next/image';
import Card from "@/components/Card";
import {
  Play,
  Pause,
  CheckCircle2,
} from "lucide-react";
import type { Task, TaskPriority } from "@/lib/tasks";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: "var(--priority-low)",
  Med: "var(--priority-medium)",
  High: "var(--priority-high)",
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatMinutes = (minutes: number) => {
  if (!minutes) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
};

interface BoardCardProps {
  task: Task;
  onClick?: () => void;
  onAction?: (e: React.MouseEvent, taskId: string, action: "play" | "pause" | "complete") => void;
}

export default function BoardCard({ task, onClick, onAction }: BoardCardProps) {
  const assigneeName = task.assignee?.name || task.assignee?.email || "Unassigned";
  const progress = task.progress || 0;

  return (
    <Card
      padding="sm"
      className="mb-3 cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
      data-task-id={task.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)] flex items-center gap-2">
            <span
              className={`priority-dot ${task.priority.toLowerCase()}`}
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            />
            {task.title}
          </div>
          {task.description ? (
            <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
              {task.description}
            </div>
          ) : null}

          {/* Dates */}
          {(task.startDate || task.dueDate) && (
            <div className="mt-2 text-[10px] flex items-center gap-3 text-[var(--muted)]">
              {task.startDate && (
                <div>
                  Start: <span className="text-[var(--foreground)]">{task.startDate}</span>
                </div>
              )}
              {task.dueDate && (
                <div className="text-[var(--status-blocked)]">
                  Due: <span className="text-[var(--foreground)]">{task.dueDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-[var(--muted)]">Progress</span>
              <span className="font-medium text-[var(--foreground)]">{progress}%</span>
            </div>
            <div className="w-full bg-[var(--border)] h-1 rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Time Tracking Comparison */}
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-[var(--muted)]">Time (Act/Est)</span>
            <span
              className={`font-medium ${
                task.estimatedTime && (task.totalElapsed || 0) / 60 > task.estimatedTime
                  ? "text-red-500"
                  : "text-[var(--foreground)]"
              }`}
            >
              {formatTime(task.totalElapsed || 0)} /{" "}
              {task.estimatedTime ? formatMinutes(task.estimatedTime) : "-"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--card-bg)] flex items-center justify-center text-[var(--muted)] border border-[var(--border)] overflow-hidden">
                {task.assignee?.avatar ? (
                  <Image src={task.assignee.avatar} alt="Avatar" width={20} height={20} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px]">{assigneeName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="text-[10px] text-[var(--muted)] truncate max-w-[60px]">
                {assigneeName}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status !== "completed" && (
                <>
                  {task.timerStatus === "playing" ? (
                    <button
                      onClick={(e) => onAction?.(e, task.id, "pause")}
                      className="p-1 hover:bg-[var(--card-bg)] rounded text-[var(--accent)]"
                      title="Pause Task"
                      aria-label="Pause task"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => onAction?.(e, task.id, "play")}
                      className="p-1 hover:bg-[var(--card-bg)] rounded text-emerald-500"
                      title="Start Task"
                      aria-label="Start task"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onAction?.(e, task.id, "complete")}
                    className="p-1 hover:bg-[var(--card-bg)] rounded text-blue-500"
                    title="Complete Task"
                    aria-label="Complete task"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
