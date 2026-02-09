"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { Search, Plus, ChevronDown, Clock, CheckCircle2, MessageCircle, ThumbsUp } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';
import {
  loadDailyLogs,
  addDailyLog,
  updateDailyLog,
  deleteDailyLog,
  toggleLogLike,
  getTodayLogs,
  getThisWeekLogs,
  getCompletedTasksCount,
  formatLogDate,
  getUniqueDepartments,
  getUniqueUsers,
  type DailyLog,
  type LogStatus,
  type LogTask,
} from '@/lib/daily-logs';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function DailyLogsPage() {
  const [logs, setLogs] = useState<DailyLog[]>(() => loadDailyLogs());
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [departmentFilter, setDepartmentFilter] = useState<string>('Owners / Founders');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilters, setStatusFilters] = useState({
    completed: true,
    'in-progress': true,
    blocked: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDepartment, setFormDepartment] = useState('');
  const [formHours, setFormHours] = useState<number>(8);
  const [formStatus, setFormStatus] = useState<LogStatus>('in-progress');
  const [formTasks, setFormTasks] = useState<LogTask[]>([]);
  const [formTaskInput, setFormTaskInput] = useState('');

  const users = getUniqueUsers();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Date filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      if (log.date !== today) return false;
    } else if (dateFilter === 'week') {
      const weekLogs = getThisWeekLogs();
      if (!weekLogs.find(l => l.id === log.id)) return false;
    }

    // Department filter
    if (log.department !== departmentFilter) return false;

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

  // Stats
  const totalLogs = filteredLogs.length;
  const weekLogs = getThisWeekLogs().length;
  const yourLogs = logs.filter(l => l.authorId === 'current-user').length;

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

  const handleSubmit = () => {
    if (!formDepartment || formTasks.length === 0) return;

    if (editingLog) {
      updateDailyLog(editingLog.id, {
        department: formDepartment,
        date: formDate,
        hoursLogged: formHours,
        tasks: formTasks,
        status: formStatus,
      });
    } else {
      addDailyLog('User', 'current-user', formDepartment, formDate, formHours, formTasks, formStatus);
    }

    setLogs(loadDailyLogs());
    resetForm();
    setShowModal(false);
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDepartment('');
    setFormHours(8);
    setFormStatus('in-progress');
    setFormTasks([]);
    setFormTaskInput('');
    setEditingLog(null);
  };

  const handleEdit = (log: DailyLog) => {
    setEditingLog(log);
    setFormDate(log.date);
    setFormDepartment(log.department);
    setFormHours(log.hoursLogged);
    setFormStatus(log.status);
    setFormTasks([...log.tasks]);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this log?')) {
      deleteDailyLog(id);
      setLogs(loadDailyLogs());
    }
  };

  const handleLike = (logId: string) => {
    toggleLogLike(logId);
    setLogs(loadDailyLogs());
  };

  const getStatusColor = (status: LogStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-500/10';
      case 'in-progress': return 'text-blue-600 bg-blue-500/10';
      case 'blocked': return 'text-red-600 bg-red-500/10';
    }
  };

  const getStatusLabel = (status: LogStatus) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'blocked': return 'Blocked';
    }
  };

  return (
    <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
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
                    setDepartmentFilter('Owners / Founders');
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
                >
                  <option value="all">All Members</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
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
            <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent hover:scrollbar-thumb-[var(--muted)] pr-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
                  <div className="text-[var(--muted)] mb-2">No logs found</div>
                  <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                    Create your first log
                  </Button>
                </div>
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
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                {getStatusLabel(log.status)}
                              </span>
                            </div>
                            <div className="text-sm text-[var(--muted)] mt-1">
                              {log.department} • {formatLogDate(log.date)}
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
                            className={`flex items-center gap-1 hover:text-[var(--foreground)] transition ${log.likes.includes('current-user') ? 'text-red-500' : ''}`}
                          >
                            <ThumbsUp className={`w-4 h-4 ${log.likes.includes('current-user') ? 'fill-current' : ''}`} />
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
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <div className="date-input-wrapper">
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                    style={{
                      colorScheme: 'dark'
                    }}
                  />
                </div>
                <style dangerouslySetInnerHTML={{__html: `
                  .date-input-wrapper input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1) !important;
                    cursor: pointer !important;
                    opacity: 1 !important;
                  }
                `}} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hours Logged</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={formHours}
                  onChange={(e) => setFormHours(Number(e.target.value))}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <select
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as LogStatus)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] [color-scheme:light] dark:[color-scheme:dark]"
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

              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent hover:scrollbar-thumb-[var(--muted)]">
                {formTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-[var(--card-surface)] rounded">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="w-4 h-4 rounded [color-scheme:light] dark:[color-scheme:dark]"
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
