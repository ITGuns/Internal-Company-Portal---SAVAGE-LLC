"use client";

import React from 'react';

export type TaskStatus = 'pending' | 'in_progress' | 'in-progress' | 'completed' | 'blocked';
export type TaskPriority = 'Low' | 'Med' | 'Medium' | 'High';
export type LogStatus = 'completed' | 'in-progress' | 'blocked';

interface StatusBadgeProps {
  /** Status value (pending, in_progress, completed, blocked) */
  status?: TaskStatus | LogStatus;
  /** Priority value (Low, Med/Medium, High) */
  priority?: TaskPriority;
  /** Override the display label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable status/priority badge component
 * Replaces repeated badge code across task-tracking, daily-logs, and announcements
 * Uses CSS variables from globals.css for consistent theming
 */
export default function StatusBadge({
  status,
  priority,
  label,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  // Determine display text
  let displayText = label;
  
  if (!displayText) {
    if (status) {
      displayText = getStatusLabel(status);
    } else if (priority) {
      displayText = getPriorityLabel(priority);
    } else {
      displayText = 'Unknown';
    }
  }

  // Determine color classes
  let colorClasses = '';
  
  if (status) {
    colorClasses = getStatusColorClasses(status);
  } else if (priority) {
    colorClasses = getPriorityColorClasses(priority);
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizeClasses[size]}
        ${colorClasses}
        ${className}
      `}
    >
      {displayText}
    </span>
  );
}

// Helper functions
function getStatusLabel(status: TaskStatus | LogStatus): string {
  // Normalize status (handle both in_progress and in-progress)
  const normalized = status === 'in_progress' ? 'in-progress' : status;
  
  switch (normalized) {
    case 'pending':
      return 'Pending';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'blocked':
      return 'Blocked';
    default:
      return status;
  }
}

function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case 'Low':
      return 'Low';
    case 'Med':
    case 'Medium':
      return 'Medium';
    case 'High':
      return 'High';
    default:
      return priority;
  }
}

function getStatusColorClasses(status: TaskStatus | LogStatus): string {
  // Normalize status
  const normalized = status === 'in_progress' ? 'in-progress' : status;
  
  switch (normalized) {
    case 'pending':
      return 'text-[var(--status-pending)] bg-[var(--status-pending-bg)]';
    case 'in-progress':
      return 'text-[var(--status-in-progress)] bg-[var(--status-in-progress-bg)]';
    case 'completed':
      return 'text-[var(--status-completed)] bg-[var(--status-completed-bg)]';
    case 'blocked':
      return 'text-[var(--status-blocked)] bg-[var(--status-blocked-bg)]';
    default:
      return 'text-[var(--muted)] bg-[var(--card-surface)]';
  }
}

function getPriorityColorClasses(priority: TaskPriority): string {
  // Normalize priority (Med -> Medium)
  const normalized = priority === 'Med' ? 'Medium' : priority;
  
  switch (normalized) {
    case 'Low':
      return 'text-[var(--priority-low)] bg-[var(--priority-low-bg)]';
    case 'Medium':
      return 'text-[var(--priority-medium)] bg-[var(--priority-medium-bg)]';
    case 'High':
      return 'text-[var(--priority-high)] bg-[var(--priority-high-bg)]';
    default:
      return 'text-[var(--muted)] bg-[var(--card-surface)]';
  }
}
