"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import {
  SortAsc,
  List,
  Grid,
  Calendar as CalendarIcon,
  Plus,
  MoreHorizontal,
  Check,
  ChevronDown,
  ArrowUpDown,
  Search,
  CheckSquare,
  Play,
  Pause,
  CheckCircle2,
  Download,
} from "lucide-react";
import { TaskBoardSkeleton } from '@/components/ui/Skeleton';
import {
  createTask,
  updateTask,
  deleteTask,
  getTaskViewPreference,
  saveTaskViewPreference,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { useTasks, useUsers, useDepartments } from "@/hooks/useTasksQuery";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";

// Lazy-loaded heavy components
const LogReportModal = dynamic(() => import("@/components/tasks/LogReportModal"), { ssr: false });

import BoardCard from "@/components/tasks/BoardCard";
import TaskModal from "@/components/tasks/TaskModal";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";

// Map backend status to nice labels
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed"
};

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

export default function TaskTrackingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Data from React Query — auto-refetches on socket data:changed events
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();

  // UI State
  const isLoading = tasksLoading;
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"grid" | "list" | "calendar">('calendar');

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState<TaskStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<TaskPriority[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | string>("");
  const [filterDeptId, setFilterDeptId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title" | "status">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "department" | "assignee" | "none">("status");

  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [showEODModal, setShowEODModal] = useState(false);

  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (displayRef.current && !displayRef.current.contains(event.target as Node)) {
        setShowDisplayMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  // Load initial data
  useEffect(() => {
    // Load preference immediately to avoid flash
    setView(getTaskViewPreference());
  }, []);

  // Action hander for Play/Pause/Complete
  const handleTaskAction = async (e: React.MouseEvent, taskId: string, action: 'play' | 'pause' | 'complete') => {
    e.stopPropagation();

    // Find local task
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let updates: Partial<Task> = {};

    if (action === 'play') {
      updates = {
        status: 'in_progress',
        timerStatus: 'playing',
        timerStart: new Date().toISOString()
      };
    } else if (action === 'pause') {
      // Calculate elapsed since timerStart
      let additionalSecs = 0;
      if (task.timerStart) {
        additionalSecs = Math.floor((new Date().getTime() - new Date(task.timerStart).getTime()) / 1000);
      }
      updates = {
        timerStatus: 'paused',
        timerStart: undefined,
        totalElapsed: (task.totalElapsed || 0) + additionalSecs
      };
    } else if (action === 'complete') {
      let finalElapsed = (task.totalElapsed || 0);
      if (task.timerStatus === 'playing' && task.timerStart) {
        finalElapsed += Math.floor((new Date().getTime() - new Date(task.timerStart).getTime()) / 1000);
      }

      // If still 0, fallback to estimated time so it doesn't look empty
      if (finalElapsed === 0 && task.estimatedTime) {
        finalElapsed = task.estimatedTime * 60;
      }

      updates = {
        status: 'completed',
        progress: 100,
        timerStatus: 'stopped',
        timerStart: undefined, // Will be set to null in backend
        totalElapsed: finalElapsed
      };
    }

    try {
      const updatedTask = await updateTask(taskId, updates);
      if (updatedTask) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success(`Task ${action === 'complete' ? 'completed' : (action === 'play' ? 'started' : 'paused')}`);
      }
    } catch (err) {
      toast.error("Failed to update task action");
    }
  };

  // Save view preference whenever it changes
  useEffect(() => {
    saveTaskViewPreference(view);
  }, [view]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | string>("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Med");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [estimatedTime, setEstimatedTime] = useState<string>("");

  const [editTaskData, setEditTaskData] = useState<Task | null>(null);
  const [progressNotes, setProgressNotes] = useState("");

  function openNewTask() {
    setEditTaskData(null);
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setStartDate("");
    setPriority("Med");
    setDepartmentId("");
    setRole("");
    setStatus("todo");
    setProgressNotes("");
    setEstimatedTime("");
    setShowModal(true);
  }

  function openEdit(task: Task) {
    setEditTaskData(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setAssigneeId(task.assigneeId || "");
    setDueDate(task.dueDate || "");
    setStartDate(task.startDate || "");
    setPriority(task.priority);
    setDepartmentId(task.departmentId || "");
    setRole(task.role || "");
    setStatus(task.status);
    setProgressNotes("");
    setEstimatedTime(task.estimatedTime?.toString() || "");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTaskData(null);
  }



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!title.trim() || !description.trim() || !departmentId || !assigneeId || !dueDate || !estimatedTime || !role) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editTaskData) {
        // Update existing
        const updates: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          departmentId,
          assigneeId,
          dueDate,
          startDate: startDate || undefined,
          role,
          estimatedTime: parseInt(estimatedTime),
        };

        if (progressNotes.trim()) {
          updates.notes = [
            { text: progressNotes.trim(), date: new Date().toISOString() },
            ...(editTaskData.notes || [])
          ];
        }

        const updated = await updateTask(editTaskData.id, updates);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success("Task updated");
      } else {
        // Create new
        const created = await createTask({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          departmentId,
          assigneeId,
          dueDate,
          startDate: startDate || undefined,
          role,
          notes: [],
          estimatedTime: parseInt(estimatedTime),
        });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success("Task created");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save task");
    }
  }

  async function handleDelete() {
    if (!editTaskData) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(editTaskData.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Task deleted");
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete task");
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF('landscape');

      // Add Title
      doc.setFontSize(20);
      doc.text("Task Report", 14, 15);

      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      // Table Header
      const tableColumn = ["Task Name", "Status", "Priority", "Department", "Assignee", "Start Date", "Due Date", "Progress", "ETOC (m)"];
      const tableRows: string[][] = [];

      sortedTasks.forEach(task => {
        const taskData = [
          task.title,
          STATUS_LABELS[task.status] || task.status,
          task.priority,
          task.department?.name || "N/A",
          task.assignee?.name || task.assignee?.email || "Unassigned",
          task.startDate || "—",
          task.dueDate || "No Date",
          `${task.progress || 0}%`,
          task.estimatedTime ? formatMinutes(task.estimatedTime) : "-"
        ];
        tableRows.push(taskData);
      });

      // Generate Table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // Blue-500
        styles: { fontSize: 8 },
        margin: { top: 30 },
      });

      const filename = `Task_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      toast.success("PDF Report generated successfully");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  // Filtering Logic
  const filteredTasks = tasks.filter(t => {
    if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
    if (filterPriority.length > 0 && !filterPriority.includes(t.priority)) return false;
    if (filterUserId && t.assigneeId?.toString() !== filterUserId.toString()) return false;
    if (filterDeptId && t.departmentId?.toString() !== filterDeptId.toString()) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sorting Logic
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "title") comparison = a.title.localeCompare(b.title);
    else if (sortBy === "dueDate") {
      comparison = (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99");
    } else if (sortBy === "priority") {
      const pMap = { High: 3, Med: 2, Low: 1 };
      comparison = pMap[a.priority] - pMap[b.priority];
    } else if (sortBy === "status") {
      const sMap = { todo: 1, in_progress: 2, review: 3, completed: 4 };
      comparison = sMap[a.status] - sMap[b.status];
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Grouping Logic for "Board" view
  type GroupColumn = { id: string | number; label: string; items: Task[] };
  let columns: GroupColumn[] = [];

  if (groupBy === "status") {
    columns = [
      { id: 'todo', label: 'To Do', items: sortedTasks.filter(t => t.status === 'todo') },
      { id: 'in_progress', label: 'In Progress', items: sortedTasks.filter(t => t.status === 'in_progress') },
      { id: 'review', label: 'Review', items: sortedTasks.filter(t => t.status === 'review') },
      { id: 'completed', label: 'Completed', items: sortedTasks.filter(t => t.status === 'completed') },
    ];
  } else if (groupBy === "priority") {
    columns = [
      { id: 'High', label: 'High Priority', items: sortedTasks.filter(t => t.priority === 'High') },
      { id: 'Med', label: 'Medium Priority', items: sortedTasks.filter(t => t.priority === 'Med') },
      { id: 'Low', label: 'Low Priority', items: sortedTasks.filter(t => t.priority === 'Low') },
    ];
  } else if (groupBy === "department") {
    columns = departments.map(d => ({
      id: d.id,
      label: d.name,
      items: sortedTasks.filter(t => t.departmentId === d.id)
    }));
    columns.push({
      id: 'none',
      label: 'No Department',
      items: sortedTasks.filter(t => !t.departmentId)
    });
  } else if (groupBy === "assignee") {
    columns = users.map(u => ({
      id: u.id,
      label: u.name || u.email,
      items: sortedTasks.filter(t => t.assigneeId === u.id)
    }));
    columns.push({
      id: 'unassigned',
      label: 'Unassigned',
      items: sortedTasks.filter(t => !t.assigneeId)
    });
  } else {
    // Single column if no grouping
    columns = [{ id: 'all', label: 'All Tasks', items: sortedTasks }];
  }

  // Stats for "Today" and "Overdue" (client-side calculation)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = filteredTasks.filter(t => t.dueDate === todayStr && t.status !== 'completed');
  const overdueTasks = filteredTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed');
  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'in_progress').length;

  // Calendar Events - Deduplicated by title and date for a cleaner view
  const events = (() => {
    const seen = new Set<string>();
    return filteredTasks
      .map((t) => {
        // If no start date and no due date, skip
        if (!t.dueDate && !t.startDate) return null;

        const start = t.startDate || t.dueDate;

        // UNIQUE CHECK: title + start date
        const key = `${t.title}-${start}`;
        if (seen.has(key)) return null;
        seen.add(key);

        let end = undefined;

        // FullCalendar end dates are exclusive, so if the event spans multiple days, 
        // we need to add 1 day to the due date.
        if (t.startDate && t.dueDate && t.startDate !== t.dueDate) {
          const endDate = new Date(t.dueDate);
          endDate.setDate(endDate.getDate() + 1);
          end = endDate.toISOString().split('T')[0];
        }

        const colorMap: Record<string, string> = {
          todo: 'var(--status-pending)',
          in_progress: 'var(--status-in-progress)',
          review: 'var(--priority-medium)',
          completed: 'var(--status-completed)',
          blocked: 'var(--status-blocked)'
        };

        return {
          id: t.id,
          title: t.title,
          start,
          end,
          extendedProps: { task: t },
          color: colorMap[t.status as string] || 'var(--status-pending)'
        };
      })
      .filter(Boolean) as any[];
  })();



  if (isLoading && tasks.length === 0) {
    return <TaskBoardSkeleton />;
  }

  return (
    <main className="h-[calc(100vh-112px)] bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden">
      <div className="p-6 pt-0 flex flex-col flex-1 min-h-0">
        <Header
          title="Task Tracking"
          subtitle="Track and manage tasks, assignments, and progress."
        />

        <div className="mt-6 flex flex-col flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button
              onClick={openNewTask}
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
            >
              New Task
            </Button>

            <Button
              onClick={handleDownloadPDF}
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
            >
              Download PDF
            </Button>

            <Button
              onClick={() => setShowEODModal(true)}
              variant="secondary"
              className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
              icon={<ClipboardCheck className="w-4 h-4" />}
            >
              Generate EOD Report
            </Button>

            <div className="relative" ref={displayRef}>
              <Button
                variant={(filterStatus.length || filterPriority.length || filterUserId || filterDeptId) ? "primary" : "secondary"}
                icon={<ArrowUpDown className="w-4 h-4" />}
                onClick={() => setShowDisplayMenu(!showDisplayMenu)}
                className="min-w-[120px]"
              >
                Organize {(filterStatus.length + filterPriority.length + (filterUserId ? 1 : 0) + (filterDeptId ? 1 : 0)) > 0 && `(${filterStatus.length + filterPriority.length + (filterUserId ? 1 : 0) + (filterDeptId ? 1 : 0)})`}
              </Button>

              {showDisplayMenu && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-30 p-4 dropdown-glass glass overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-2">
                    <span className="font-bold text-sm">Display & Filter</span>
                    <button
                      className="text-[10px] text-[var(--accent)] hover:underline uppercase font-bold"
                      onClick={() => {
                        setFilterStatus([]);
                        setFilterPriority([]);
                        setFilterUserId("");
                        setFilterDeptId("");
                        setSortBy("dueDate");
                        setSortOrder("asc");
                        setGroupBy("status");
                      }}
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="overflow-y-auto chat-scroll pr-1 flex-1">
                    {/* Sort By */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-2">Sort By</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: "dueDate", label: "Due Date" },
                          { val: "priority", label: "Priority" },
                          { val: "status", label: "Status" },
                          { val: "title", label: "Title" },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => {
                              if (sortBy === opt.val) setSortOrder(prev => prev === "asc" ? "desc" : "asc");
                              else {
                                setSortBy(opt.val as any);
                                setSortOrder("asc");
                              }
                            }}
                            className={`px-3 py-2 text-xs rounded border transition-all flex items-center justify-between ${sortBy === opt.val
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)] font-medium'
                              : 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--muted)]'
                              }`}
                          >
                            {opt.label}
                            {sortBy === opt.val && (sortOrder === "asc" ? <SortAsc className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-180" />)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Group By */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-2">Group By</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: "status", label: "Status" },
                          { val: "priority", label: "Priority" },
                          { val: "department", label: "Department" },
                          { val: "assignee", label: "Assignee" },
                          { val: "none", label: "No Grouping" },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setGroupBy(opt.val as any)}
                            className={`px-3 py-2 text-xs rounded border transition-all flex items-center justify-between ${groupBy === opt.val
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)] font-medium'
                              : 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--muted)]'
                              }`}
                          >
                            {opt.label}
                            {groupBy === opt.val && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-[var(--border)] my-4" />

                    {/* Filters: Status */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-2">Filter by Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => {
                              const v = val as TaskStatus;
                              setFilterStatus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
                            }}
                            className={`px-2 py-1.5 text-xs rounded border transition-colors flex items-center justify-between ${filterStatus.includes(val as TaskStatus)
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                              : 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--muted)]'
                              }`}
                          >
                            {label}
                            {filterStatus.includes(val as TaskStatus) && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filters: Priority */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-2">Filter by Priority</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["High", "Med", "Low"].map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              const v = p as TaskPriority;
                              setFilterPriority(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
                            }}
                            className={`px-2 py-1.5 text-xs rounded border transition-colors flex items-center justify-between ${filterPriority.includes(p as TaskPriority)
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                              : 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--muted)]'
                              }`}
                          >
                            {p}
                            {filterPriority.includes(p as TaskPriority) && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dropdown Filters */}
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label htmlFor="filter-assignee" className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-1">Assignee</label>
                        <select
                          id="filter-assignee"
                          value={filterUserId}
                          onChange={(e) => setFilterUserId(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-1.5 text-xs"
                        >
                          <option value="">All Members</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="filter-department" className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-1">Department</label>
                        <select
                          id="filter-department"
                          value={filterDeptId}
                          onChange={(e) => setFilterDeptId(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-1.5 text-xs"
                        >
                          <option value="">All Departments</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative mr-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                <input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-full bg-[var(--card-bg)] border border-[var(--border)] text-xs focus:ring-1 focus:ring-[var(--accent)] outline-none w-48 transition-all focus:w-64"
                />
              </div>
              <Button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                variant={view === "list" ? "primary" : "secondary"}
                icon={<List className="w-4 h-4" />}
                size="sm"
              />
              <Button
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                variant={view === "grid" ? "primary" : "secondary"}
                icon={<Grid className="w-4 h-4" />}
                size="sm"
              />
              <Button
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
                variant={view === "calendar" ? "primary" : "secondary"}
                icon={<CalendarIcon className="w-4 h-4" />}
                size="sm"
              />
            </div>
          </div>

          {view === "grid" && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {sortedTasks.length === 0 && (
                <EmptyState
                  icon={CheckSquare}
                  title="No tasks yet"
                  description="Create a new task to get started and organize your work."
                  actionLabel="Create your first task"
                  onAction={() => setShowModal(true)}
                />
              )}

              {sortedTasks.length > 0 && (
                <div className="overflow-x-auto flex-1 chat-scroll pb-2">
                  <div className="flex gap-4 h-full" style={{ width: 'max-content' }}>
                    {columns.map(col => (
                      <div className="w-[300px] h-full flex flex-col" key={col.id}>
                        <Card className="flex flex-col overflow-hidden bg-[var(--card-bg)] h-full shadow-sm border-[var(--border)]">
                          <div className={`px-4 py-3 flex items-center justify-between border-b flex-shrink-0 ${groupBy === 'priority' && col.id === 'High' ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border)]'
                            }`}>
                            <div className="text-sm font-semibold truncate">
                              {col.label}{" "}
                              <span className="text-xs text-[var(--muted)] ml-1">
                                {col.items.length}
                              </span>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                          </div>
                          <div className="p-3 bg-[var(--card-surface)] flex-1 overflow-y-auto chat-scroll scroll-smooth">
                            {col.items.length === 0 ? (
                              <div className="py-10 text-center opacity-50 text-xs">Empty</div>
                            ) : (
                              col.items.map((t) => (
                                <BoardCard
                                  key={t.id}
                                  task={t}
                                  onClick={() => openEdit(t)}
                                  onAction={handleTaskAction}
                                />
                              ))
                            )}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "list" && (
            <div className="flex-1 overflow-y-auto chat-scroll pr-2 pb-6">
              {sortedTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="No tasks yet"
                  description="Create a new task to get started and organize your work."
                  actionLabel="Create your first task"
                  onAction={() => setShowModal(true)}
                />
              ) : (
                <div className="space-y-3">
                  {sortedTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openEdit(t)}
                      className="p-3 bg-[var(--card-surface)] border border-[var(--border)] rounded flex items-center justify-between cursor-pointer hover:bg-[var(--card-bg)] transition-all animate-in fade-in slide-in-from-left-2 duration-200 group"
                    >
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.1)] flex-shrink-0"
                            style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                          />
                          <div className="font-medium text-sm truncate">{t.title}</div>
                        </div>

                        {/* Progress Inline */}
                        <div className="w-32 hidden sm:block">
                          <div className="w-full bg-[var(--border)] h-1 rounded-full overflow-hidden">
                            <div className="bg-[var(--accent)] h-full transition-all" style={{ width: `${t.progress || 0}%` }} />
                          </div>
                        </div>

                        {/* Time Comparison List */}
                        <div className="hidden lg:block w-32 text-[10px] text-right">
                          <div className="text-[var(--muted)]">Time Spent</div>
                          <div className={t.estimatedTime && (t.totalElapsed || 0) / 60 > t.estimatedTime ? 'text-red-500 font-medium' : 'text-[var(--foreground)]'}>
                            {formatTime(t.totalElapsed || 0)} / {t.estimatedTime ? `${t.estimatedTime}m` : '-'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[var(--card-bg)] px-1 rounded border border-[var(--border)] text-[var(--muted)]">
                            {t.department?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Inline Controls */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.status !== 'completed' && (
                            <>
                              {t.timerStatus === 'playing' ? (
                                <button onClick={(e) => handleTaskAction(e, t.id, 'pause')} className="p-1.5 hover:bg-[var(--card-bg)] rounded text-[var(--accent)]" aria-label="Pause task">
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ) : (
                                <button onClick={(e) => handleTaskAction(e, t.id, 'play')} className="p-1.5 hover:bg-[var(--card-bg)] rounded text-emerald-500" aria-label="Start task">
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}
                              <button onClick={(e) => handleTaskAction(e, t.id, 'complete')} className="p-1.5 hover:bg-[var(--card-bg)] rounded text-blue-500" aria-label="Complete task">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-xs text-[var(--muted)]">
                          <div className={`px-2 py-0.5 rounded border ${t.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-[var(--card-bg)] border-[var(--border)]'
                            }`}>
                            {STATUS_LABELS[t.status]}
                          </div>
                          <div className="w-24 truncate text-right font-medium">
                            {t.assignee ? (t.assignee.name || t.assignee.email) : 'Unassigned'}
                          </div>
                          <div className="w-32 text-right tabular-nums flex flex-col text-[10px] gap-0.5 justify-center">
                            <div className="text-[var(--muted)]">Start: <span className="text-[var(--foreground)]">{t.startDate || '-'}</span></div>
                            <div className="text-[var(--status-blocked)]">Due: <span className="text-[var(--foreground)]">{t.dueDate || '-'}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "calendar" && (
            <TaskCalendarView
              events={events}
              todaysTasks={todaysTasks}
              overdueTasks={overdueTasks}
              totalCount={filteredTasks.length}
              completedCount={completedCount}
              inProgressCount={inProgressCount}
              onEditTask={openEdit}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <TaskModal
          editTaskData={editTaskData}
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          assigneeId={assigneeId} setAssigneeId={setAssigneeId}
          dueDate={dueDate} setDueDate={setDueDate}
          startDate={startDate} setStartDate={setStartDate}
          priority={priority} setPriority={setPriority}
          departmentId={departmentId} setDepartmentId={setDepartmentId}
          role={role} setRole={setRole}
          status={status} setStatus={setStatus}
          estimatedTime={estimatedTime} setEstimatedTime={setEstimatedTime}
          progressNotes={progressNotes} setProgressNotes={setProgressNotes}
          departments={departments} users={users}
          onSubmit={handleSubmit} onDelete={handleDelete} onClose={closeModal}
        />
      )}

      {/* Log Report Modal */}
      <LogReportModal
        isOpen={showEODModal}
        onClose={() => setShowEODModal(false)}
        tasks={tasks}
      />
    </main>
  );
}
