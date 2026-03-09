"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import FormField from '@/components/forms/FormField';
import { useToast } from '@/components/ToastProvider';
import { useUser } from '@/contexts/UserContext';
import { Search, Plus, Clock, CheckCircle2, MessageCircle, ThumbsUp, FileText, StickyNote } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';
import {
  fetchDailyLogs,
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

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function DailyLogsPage() {
  const toast = useToast();
  const { user: currentUser } = useUser();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

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

  // Form state
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [formDepartment, setFormDepartment] = useState('');
  const [formHours, setFormHours] = useState<number>(8);
  const [formStatus, setFormStatus] = useState<LogStatus>('in-progress');
  const [formTasks, setFormTasks] = useState<LogTask[]>([]);
  const [formTaskInput, setFormTaskInput] = useState('');
  const [formShiftNotes, setFormShiftNotes] = useState('');
  const [formLogType, setFormLogType] = useState<string>('daily');

  // Set default department when user loads
  useEffect(() => {
    if (currentUser?.department && !formDepartment) {
      setFormDepartment(currentUser.department);
    }
    // Also default filter if same department
    if (currentUser?.department && departmentFilter === DEPARTMENTS[0]) {
      // if not admin, default to their department
      // if admin, keep "All Departments"
      if (currentUser.role?.toLowerCase() !== 'admin') {
        setDepartmentFilter(currentUser.department);
      }
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchDailyLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const users = getUniqueUsers(logs);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Date filter
    if (dateFilter === 'today') {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (log.date !== today) return false;
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

  if (loading) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-3">
          <Header title="Daily Logs" subtitle="Track daily progress and tasks" />
          <LoadingSpinner message="Loading daily logs..." />
        </div>
      </main>
    );
  }

  // Stats
  const totalLogs = filteredLogs.length;
  const weekLogs = getThisWeekLogs(logs).length;
  const yourLogs = currentUser ? logs.filter(l => l.authorId === String(currentUser.id)).length : 0;

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

  const handleSubmit = async () => {
    if (!formDepartment || formTasks.length === 0) return;

    try {
      if (editingLog) {
        await updateDailyLog(editingLog.id, {
          department: formDepartment,
          date: formDate,
          hoursLogged: formHours,
          tasks: formTasks,
          status: formStatus,
          shiftNotes: formShiftNotes,
          logType: formLogType,
        });
        toast.success('Daily log updated successfully');
      } else {
        await createDailyLog(formDepartment, formDate, formHours, formTasks, formStatus, formShiftNotes, formLogType);
        toast.success('Daily log added successfully');
      }

      await loadData();
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
    setFormDepartment(currentUser?.department || '');
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
    await loadData();
  };

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header
          title="Daily Logs"
          subtitle="Track daily progress and team activities"
        />

        <div className="mt-6 flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Filters</h3>
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
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.completed}
                      onChange={(e) => setStatusFilters({ ...statusFilters, completed: e.target.checked })}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-sm">Completed</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilters['in-progress']}
                      onChange={(e) => setStatusFilters({ ...statusFilters, 'in-progress': e.target.checked })}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-sm">In Progress</span>
                  </label>
                  <label className="flex items-center gap-2">
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
                <h4 className="font-semibold text-sm mb-3">Quick Stats</h4>
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
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
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
            <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 chat-scroll">
              {filteredLogs.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No logs found"
                  description="Get started by creating your first daily log"
                  actionLabel="Create your first log"
                  onAction={() => setShowModal(true)}
                />
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6 hover:shadow-sm transition">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-[var(--card-surface)] flex items-center justify-center font-semibold flex-shrink-0">
                        {log.author.charAt(0)}
                      </div>

                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{log.author}</h3>
                              <StatusBadge status={log.status} size="md" />
                            </div>
                            <div className="text-sm text-[var(--muted)] mt-1">
                              {log.department} • {formatLogDate(log.date)} • <span className="capitalize">{log.logType}</span>
                            </div>
                          </div>
                          <button className="text-[var(--muted)] hover:text-[var(--foreground)]">⋮</button>
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
                                <span className={task.completed ? 'line-through text-[var(--muted)]' : ''}>
                                  {task.text}
                                </span>
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
                        <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{log.hoursLogged} hours logged</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{getCompletedTasksCount(log)} tasks completed</span>
                          </div>
                          <button
                            onClick={() => handleLike(log.id)}
                            className={`flex items-center gap-1 hover:text-[var(--foreground)] transition ${currentUser && log.likes.includes(String(currentUser.id)) ? 'text-red-500' : ''}`}
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
                ))
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
              <label className="block text-sm font-medium mb-2">Department</label>
              <select
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="Department"
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
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
                disabled={!formDepartment || formTasks.length === 0}
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
