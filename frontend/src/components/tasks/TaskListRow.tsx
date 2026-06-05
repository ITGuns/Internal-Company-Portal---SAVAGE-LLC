"use client";

import React from "react";
import { Play, Pause, CheckCircle2, RotateCcw } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks";
import { useLiveElapsed } from "@/hooks/useLiveElapsed";
import { TASK_QUICK_ACTION_LABELS, type TaskQuickAction } from "@/lib/task-status-actions";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: "var(--priority-low)",
  Med: "var(--priority-medium)",
  High: "var(--priority-high)",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

interface TaskListRowProps {
  task: Task;
  onClick: () => void;
  onAction: (e: React.MouseEvent, taskId: string, action: TaskQuickAction) => void;
}

function calcProgress(elapsedSecs: number, estimatedMinutes: number | undefined): number {
  if (!estimatedMinutes) return 0;
  return Math.min(100, Math.round((elapsedSecs / (estimatedMinutes * 60)) * 100));
}

export default function TaskListRow({ task, onClick, onAction }: TaskListRowProps) {
  const liveElapsed = useLiveElapsed(task.timerStatus, task.timerStart, task.totalElapsed || 0);
  const autoProgress = task.status === 'completed' ? 100 : calcProgress(liveElapsed, task.estimatedTime);
  const actionButtonClass =
    "inline-flex min-h-8 items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium transition hover:bg-[var(--card-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div
      onClick={onClick}
      className="motion-interactive motion-list-in p-3 bg-[var(--card-surface)] border border-[var(--border)] rounded flex items-center justify-between cursor-pointer hover:bg-[var(--card-bg)] group"
    >
      <div className="flex-1 flex items-center gap-4">
        <div className="flex items-center gap-2 min-w-[200px]">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.1)] flex-shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
          <div className="font-medium text-sm truncate">{task.title}</div>
        </div>

        {/* Progress Inline */}
        <div className="w-32 hidden sm:block">
          <div className="w-full bg-[var(--border)] h-1 rounded-full overflow-hidden">
            <div className="bg-[var(--accent)] h-full motion-progress" style={{ width: `${autoProgress}%` }} />
          </div>
        </div>

        {/* Time Comparison List */}
        <div className="hidden lg:block w-32 text-[10px] text-right">
          <div className="text-[var(--muted)]">Time Spent</div>
          <div className={task.estimatedTime && liveElapsed / 60 > task.estimatedTime ? 'text-red-500 font-medium' : 'text-[var(--foreground)]'}>
            {formatTime(liveElapsed)} / {task.estimatedTime ? `${task.estimatedTime}m` : '-'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-[var(--card-bg)] px-1 rounded border border-[var(--border)] text-[var(--muted)]">
            {task.department?.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Inline Controls */}
        <div className="flex items-center gap-1">
          {task.status === 'completed' ? (
            <button
              onClick={(e) => onAction(e, task.id, 'reopen')}
              className={`${actionButtonClass} text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/10`}
              aria-label={`Reopen ${task.title}`}
              title="Reopen task"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{TASK_QUICK_ACTION_LABELS.reopen}</span>
            </button>
          ) : (
            <>
              {task.timerStatus === 'playing' ? (
                <button
                  onClick={(e) => onAction(e, task.id, 'pause')}
                  className={`${actionButtonClass} text-[var(--accent)]`}
                  aria-label={`Pause ${task.title}`}
                  title="Pause task"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{TASK_QUICK_ACTION_LABELS.pause}</span>
                </button>
              ) : (
                <button
                  onClick={(e) => onAction(e, task.id, 'play')}
                  className={`${actionButtonClass} text-emerald-500`}
                  aria-label={`Start ${task.title}`}
                  title="Start task"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{TASK_QUICK_ACTION_LABELS.play}</span>
                </button>
              )}
              <button
                onClick={(e) => onAction(e, task.id, 'complete')}
                className={`${actionButtonClass} text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/10`}
                aria-label={`Mark ${task.title} done`}
                title="Mark done"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{TASK_QUICK_ACTION_LABELS.complete}</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-6 text-xs text-[var(--muted)]">
          <div className={`px-2 py-0.5 rounded border ${task.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-[var(--card-bg)] border-[var(--border)]'
            }`}>
            {STATUS_LABELS[task.status]}
          </div>
          <div className="w-24 truncate text-right font-medium">
            {task.assignee ? (task.assignee.name || task.assignee.email) : 'Unassigned'}
          </div>
          <div className="w-32 text-right tabular-nums flex flex-col text-[10px] gap-0.5 justify-center">
            <div className="text-[var(--muted)]">Start: <span className="text-[var(--foreground)]">{task.startDate || '-'}</span></div>
            <div className="text-[var(--status-blocked)]">Due: <span className="text-[var(--foreground)]">{task.dueDate || '-'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
