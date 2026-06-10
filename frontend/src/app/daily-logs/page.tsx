"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { DailyLogsSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import FormField from '@/components/forms/FormField';
import { useToast } from '@/components/ToastProvider';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, CheckCircle2, MessageCircle, ThumbsUp, FileText, StickyNote, ClipboardList } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';
import { useDailyLogs } from '@/hooks/useDailyLogsQuery';
import { useTasks } from '@/hooks/useTasksQuery';
import {
  createDailyLog,
  updateDailyLog,
  toggleLogLike,
  getThisWeekLogs,
  getCompletedTasksCount,
  formatLogDate,
  getUniqueUsers,
  type DailyLog,
  type LogStatus,
  type LogTask,
} from '@/lib/daily-logs';
import {
  getDailyLogTaskImportOptions,
  getDailyLogTaskReviewOptions,
  mergeDailyLogTasksWithImports,
  type DailyLogTaskImportOption,
} from '@/lib/daily-log-task-import';
import { shouldOpenCreateFromSearch } from '@/lib/dashboard-deep-links';
import { getDailyLogReviewSummary } from '@/lib/daily-log-review';
import { hasManagementAccess } from '@/lib/role-access';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function DailyLogsPage() {
  const toast = useToast();
  const { user: currentUser } = useUser();
  const currentUserDepartment = currentUser?.department;
  const canReviewTeamLogs = hasManagementAccess(currentUser);
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading: loading } = useDailyLogs();
  const currentUserId = currentUser?.id ? String(currentUser.id) : '';
  const {
    data: trackedTasks = [],
    isLoading: trackedTasksLoading,
  } = useTasks(undefined, canReviewTeamLogs ? undefined : currentUserId || undefined, {
    enabled: canReviewTeamLogs || Boolean(currentUserId),
  });
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const handledNewLogDeepLinkRef = useRef(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [departmentFilter, setDepartmentFilter] = useState<string>(DEPARTMENTS[0]);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilters, setStatusFilters] = useState({
    completed: true,
    'in-progress': true,
    blocked: true,
  });
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Form state
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [formHours, setFormHours] = useState<number>(8);
  const [formStatus, setFormStatus] = useState<LogStatus>('in-progress');
  const [formTasks, setFormTasks] = useState<LogTask[]>([]);
  const [formTaskInput, setFormTaskInput] = useState('');
  const [formShiftNotes, setFormShiftNotes] = useState('');
  const [formLogType, setFormLogType] = useState<string>('daily');
  const taskImportOptions = useMemo(
    () => getDailyLogTaskImportOptions(trackedTasks, {
      currentUserId,
      selectedDate: formDate,
      existingTasks: formTasks,
    }),
    [currentUserId, formDate, formTasks, trackedTasks],
  );
  const taskReviewOptions = useMemo(
    () => getDailyLogTaskReviewOptions(trackedTasks, {
      currentUserId,
      selectedDate: formDate,
      existingTasks: formTasks,
    }),
    [currentUserId, formDate, formTasks, trackedTasks],
  );
  const taskLookup = useMemo(
    () => new Map(trackedTasks.map((task) => [task.id, task])),
    [trackedTasks],
  );

  // Set default department when user loads
  useEffect(() => {
    if (currentUserDepartment && !canReviewTeamLogs) {
      setDepartmentFilter(previous => {
        if (previous === DEPARTMENTS[0]) {
          return currentUserDepartment;
        }
        return previous;
      });
    }
  }, [canReviewTeamLogs, currentUserDepartment]);

  useEffect(() => {
    if (handledNewLogDeepLinkRef.current || typeof window === 'undefined') return;

    if (shouldOpenCreateFromSearch(new URLSearchParams(window.location.search))) {
      handledNewLogDeepLinkRef.current = true;
      setEditingLog(null);
      setShowModal(true);
    }
  }, []);



  const users = getUniqueUsers(logs);
  const reviewSummary = getDailyLogReviewSummary(logs, {
    selectedUserId: userFilter === 'all' ? undefined : userFilter,
  });
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Date filter
    if (dateFilter === 'today') {
      if (log.date !== todayStr) return false;
    } else if (dateFilter === 'week') {
      const weekLogs = getThisWeekLogs(logs);
      if (!weekLogs.find(l => l.id === log.id)) return false;
    } else if (dateFilter === 'month') {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (log.date < fmt(firstDayOfMonth)) return false;
    }

    // Log type filter
    if (logTypeFilter !== 'all' && log.logType !== logTypeFilter) return false;

    // Department filter
    if (departmentFilter !== 'All Departments' && log.department !== departmentFilter) return false;

    // User filter
    if (userFilter !== 'all' && log.authorId !== userFilter) return false;

    // Status filter
    if (!statusFilters[log.status]) return false;

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesAuthor = log.author.toLowerCase().includes(searchLower);
      const matchesTasks = log.tasks.some(task => task.text.toLowerCase().includes(searchLower));
      if (!matchesAuthor && !matchesTasks) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFilter, departmentFilter, userFilter, statusFilters, logTypeFilter, searchQuery]);

  if (loading) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-3">
          <Header title="Daily Logs" subtitle="Track daily progress and tasks" />
          <DailyLogsSkeleton />
        </div>
      </main>
    );
  }

  // Stats
  const totalLogs = filteredLogs.length;
  const weekLogs = getThisWeekLogs(logs).length;
  const yourLogs = currentUser ? logs.filter(l => l.authorId === String(currentUser.id)).length : 0;
  const todayLogs = logs.filter((log) => log.date === todayStr).length;
  const blockedLogs = filteredLogs.filter((log) => log.status === 'blocked').length;

  const handleAddTask = () => {
    if (!formTaskInput.trim()) return;
    const newTask: LogTask = {
      id: `task-${Date.now()}`,
      text: formTaskInput.trim(),
      completed: false,
    };
    setFormTasks([...formTasks, newTask]);
    setFormTaskInput('');
  };

  const handleToggleTask = (taskId: string) => {
    setFormTasks(formTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleRemoveTask = (taskId: string) => {
    setFormTasks(formTasks.filter(task => task.id !== taskId));
  };

  const handleImportTask = (option: DailyLogTaskImportOption) => {
    setFormTasks((tasks) => mergeDailyLogTasksWithImports(tasks, [option]));
  };

  const handleImportAllTasks = () => {
    setFormTasks((tasks) => mergeDailyLogTasksWithImports(tasks, taskImportOptions));
    if (taskImportOptions.length > 0) {
      toast.success(`Imported ${taskImportOptions.length} task${taskImportOptions.length === 1 ? '' : 's'} from Task Tracking`);
    }
  };

  const handleSubmit = async () => {
    if (formTasks.length === 0) return;

    try {
      let savedLog: DailyLog | null = null;

      if (editingLog) {
        savedLog = await updateDailyLog(editingLog.id, {
          date: formDate,
          hoursLogged: formHours,
          tasks: formTasks,
          status: formStatus,
          shiftNotes: formShiftNotes,
          logType: formLogType,
        });
      } else {
        savedLog = await createDailyLog({
          date: formDate,
          hoursLogged: formHours,
          tasks: formTasks,
          status: formStatus,
          shiftNotes: formShiftNotes,
          logType: formLogType,
        });
      }

      if (!savedLog) {
        throw new Error('Daily log save returned no data');
      }

      toast.success(editingLog ? 'Daily log updated successfully' : 'Daily log added successfully');
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save log:', err);
      toast.error('Failed to save log');
    }
  };

  const resetForm = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setFormDate(today);
    setFormHours(8);
    setFormStatus('in-progress');
    setFormTasks([]);
    setFormTaskInput('');
    setFormShiftNotes('');
    setFormLogType('daily');
    setEditingLog(null);
  };

  const handleLike = async (logId: string) => {
    await toggleLogLike(logId);
    queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
  };

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header
          title="Daily Logs"
          subtitle="Track daily progress and team activities"
        />

        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--foreground)]">Log today's work before review</div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Create the daily record first, then use filters when you need to audit older logs or team activity.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
                Add Log
              </Button>
              <Button variant="secondary" icon={<ClipboardList className="w-4 h-4" />} onClick={() => setDateFilter('today')}>
                Show Today
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Today", value: todayLogs, caption: "Logs submitted" },
              { label: "Your logs", value: yourLogs, caption: "Personal history" },
              { label: "Blocked", value: blockedLogs, caption: "Needs follow-up" },
            ].map((item) => (
              <div key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2">
                <div className="text-xs text-[var(--muted)]">{item.label}</div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <span className="font-mono text-2xl font-semibold tabular-nums">{item.value}</span>
                  <span className="text-xs text-[var(--muted)]">{item.caption}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {/* Filters Sidebar */}
          <div className="order-2 min-w-0 lg:order-1">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Filters</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFilter('today');
                    setDepartmentFilter(DEPARTMENTS[0]);
                    setUserFilter('all');
                    setStatusFilters({ completed: true, 'in-progress': true, blocked: true });
                    setSearchQuery('');
                  }}
                >
                  Reset
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm [color-scheme:light] dark:[color-scheme:dark]"
                  aria-label="Date Range"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm [color-scheme:light] dark:[color-scheme:dark]"
                  aria-label="Department"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Team Member</label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm [color-scheme:light] dark:[color-scheme:dark]"
                  aria-label="Team Member"
                >
                  <option value="all">All Members</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Log Type</label>
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm [color-scheme:light] dark:[color-scheme:dark]"
                  aria-label="Log Type"
                >
                  <option value="all">All Types</option>
                  <option value="daily">Daily / EOD</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className="space-y-2">
                  <label className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.completed}
                      onChange={(e) => setStatusFilters({ ...statusFilters, completed: e.target.checked })}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-sm">Completed</span>
                  </label>
                  <label className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-2">
                    <input
                      type="checkbox"
                      checked={statusFilters['in-progress']}
                      onChange={(e) => setStatusFilters({ ...statusFilters, 'in-progress': e.target.checked })}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-sm">In Progress</span>
                  </label>
                  <label className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.blocked}
                      onChange={(e) => setStatusFilters({ ...statusFilters, blocked: e.target.checked })}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-sm">Blocked</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <h3 className="font-semibold text-sm mb-3">Quick Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Total Logs</span>
                    <span className="font-semibold">{totalLogs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">This Week</span>
                    <span className="font-semibold">{weekLogs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Your Logs</span>
                    <span className="font-semibold">{yourLogs}</span>
                  </div>
                </div>
              </div>

              {canReviewTeamLogs && (
                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-semibold text-sm mb-3">Manager Review</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Reviewed Logs</span>
                      <span className="font-semibold">{reviewSummary.totalLogs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Completed</span>
                      <span className="font-semibold">{reviewSummary.completedLogs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Blocked</span>
                      <span className="font-semibold">{reviewSummary.blockedLogs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Linked Tasks</span>
                      <span className="font-semibold">{reviewSummary.linkedTaskCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Hours</span>
                      <span className="font-semibold">{reviewSummary.totalHours}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      Last log: {reviewSummary.lastLogDate || 'No logs yet'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="order-1 min-w-0 lg:order-2">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search logs by keyword, task, or person..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
                Add Log
              </Button>
            </div>

            {/* Log Entries */}
            <div className="h-[calc(100vh-12rem)] space-y-4 overflow-y-auto pr-2 pb-24 chat-scroll">
              {filteredLogs.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No logs found"
                  description="Get started by creating your first daily log"
                  actionLabel="Create your first log"
                  onAction={() => setShowModal(true)}
                />
              ) : (
                <>
                  {paginatedLogs.map(log => (
                  <div key={log.id} className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 transition hover:shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-[var(--card-surface)] flex items-center justify-center font-semibold flex-shrink-0">
                        {log.author.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Header */}
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-semibold">{log.author}</h2>
                              <StatusBadge status={log.status} size="md" />
                            </div>
                            <div className="mt-1 text-sm text-[var(--muted)]">
                              {log.department} • {formatLogDate(log.date)} • <span className="capitalize">{log.logType}</span>
                            </div>
                          </div>
                          <button type="button" aria-label={`Open actions for ${log.author}'s log`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)]">⋮</button>
                        </div>

                        {/* Tasks */}
                        <div className="mb-4">
                          <div className="text-sm font-medium mb-2">What I Did Today:</div>
                          <div className="space-y-1">
                            {log.tasks.map(task => (
                              <div key={task.id} className="flex items-start gap-2 text-sm">
                                {task.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] flex-shrink-0 mt-0.5" />
                                )}
                                <div className="min-w-0">
                                  <span className={task.completed ? 'line-through text-[var(--muted)]' : ''}>
                                    {task.text}
                                  </span>
                                  {task.id.startsWith('task:') && (
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                                      <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-600 dark:text-sky-300">
                                        Task Tracking
                                      </span>
                                      {taskLookup.get(task.id.slice('task:'.length))?.workSessions?.length ? (
                                        <span>
                                          {taskLookup.get(task.id.slice('task:'.length))?.workSessions?.length} session{taskLookup.get(task.id.slice('task:'.length))?.workSessions?.length === 1 ? '' : 's'}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* EOD Shift Notes */}
                        {log.shiftNotes && (
                          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                              <StickyNote className="w-3.5 h-3.5" />
                              EOD Shift Notes
                            </div>
                            <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                              {log.shiftNotes}
                            </p>
                          </div>
                        )}

                        {/* Footer Stats */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{log.hoursLogged} hours logged</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{getCompletedTasksCount(log)} tasks completed</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLike(log.id)}
                            className={`flex min-h-10 items-center gap-1 rounded-[var(--radius-md)] px-2 transition hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] ${currentUser && log.likes.includes(String(currentUser.id)) ? 'text-red-500' : ''}`}
                          >
                            <ThumbsUp className={`w-4 h-4 ${currentUser && log.likes.includes(String(currentUser.id)) ? 'fill-current' : ''}`} />
                            <span>{log.likes.length} {log.likes.length === 1 ? 'like' : 'likes'}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{log.comments} {log.comments === 1 ? 'comment' : 'comments'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    total={filteredLogs.length}
                    className="mt-6"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Log Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingLog ? "Edit Daily Log" : "Add Daily Log"}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="log-date"
                label="Date"
                type="date"
                value={formDate}
                onChange={setFormDate}
                icon={Clock}
              />
              <FormField
                id="log-hours"
                label="Hours Logged"
                type="number"
                value={formHours}
                onChange={(val) => setFormHours(Number(val))}
                min={0}
                max={24}
                step={0.5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Log Type</label>
              <select
                value={formLogType}
                onChange={(e) => setFormLogType(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="Log Type"
              >
                <option value="daily">Daily / EOD</option>
                <option value="weekly">End of Week</option>
                <option value="monthly">End of Month</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as LogStatus)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="Status"
              >
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tasks Completed Today</label>
              <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--card-surface)] p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <ClipboardList className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                    <div>
                      <div className="text-sm font-medium">Import from Task Tracking</div>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Completed and in-progress tasks assigned to you for {formDate}.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleImportAllTasks}
                    disabled={taskImportOptions.length === 0}
                  >
                    Import All
                  </Button>
                </div>

                {trackedTasksLoading ? (
                  <div className="text-xs text-[var(--muted)]">Checking your assigned tasks...</div>
                ) : taskImportOptions.length === 0 ? (
                  <div className="text-xs text-[var(--muted)]">
                    No matching task-tracking items found for this date. You can still add work manually below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {taskImportOptions.map(option => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{option.text}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                            <span className={option.completed ? 'text-emerald-500' : 'text-blue-500'}>
                              {option.completed ? 'Completed' : 'In Progress'}
                            </span>
                            {typeof option.progress === 'number' && (
                              <span>{option.progress}% progress</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImportTask(option)}
                        >
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {taskReviewOptions.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Optional review-stage tasks
                    </div>
                    <div className="space-y-2">
                      {taskReviewOptions.map(option => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between gap-3 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{option.text}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                              <span className="text-amber-600 dark:text-amber-300">Review</span>
                              {typeof option.progress === 'number' && (
                                <span>{option.progress}% progress</span>
                              )}
                              {option.sessionCount ? (
                                <span>{option.sessionCount} session{option.sessionCount === 1 ? '' : 's'}</span>
                              ) : null}
                              {option.trackedMinutes ? (
                                <span>{option.trackedMinutes}m tracked</span>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImportTask(option)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={formTaskInput}
                  onChange={(e) => setFormTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                  placeholder="Add a task..."
                  className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
                />
                <Button variant="secondary" onClick={handleAddTask}>
                  Add
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto chat-scroll">
                {formTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-[var(--card-surface)] rounded">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
                      aria-label="Mark task as completed"
                    />
                    <span className={`flex-1 text-sm ${task.completed ? 'line-through text-[var(--muted)]' : ''}`}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* EOD Shift Notes */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="shift-notes">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  EOD Shift Notes
                  <span className="text-[var(--muted)] font-normal text-xs">(optional)</span>
                </span>
              </label>
              <textarea
                id="shift-notes"
                value={formShiftNotes}
                onChange={(e) => setFormShiftNotes(e.target.value)}
                placeholder="Summarize handover info, blockers, highlights, or anything the next shift should know..."
                rows={4}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm resize-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleSubmit}
                disabled={formTasks.length === 0}
                icon={<Plus className="w-4 h-4" />}
              >
                {editingLog ? 'Update Log' : 'Add Log'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
