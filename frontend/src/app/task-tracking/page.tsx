"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  X,
  ChevronDown,
  ArrowUpDown,
  Search,
  CheckSquare,
  Download,
  Pause,
  Play,
} from "lucide-react";
import { TaskBoardSkeleton } from '@/components/ui/Skeleton';
import {
  createTask,
  updateTask,
  deleteTask,
  fetchTaskDetail,
  getTaskViewPreference,
  saveTaskViewPreference,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { useTasks, useUsers, useDepartments } from "@/hooks/useTasksQuery";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import {
  canManageTaskAssignments,
  getUserTaskAssignment,
} from "@/lib/task-access";
import { shouldOpenCreateFromSearch } from "@/lib/dashboard-deep-links";
import {
  getTaskDeepLinkState,
  getTaskFilterDescription,
  getTaskFilterLabel,
  getTaskUrlWithoutDeepLinkFilter,
  taskMatchesDeepLinkFilter,
  type TaskDeepLinkFilter,
} from "@/lib/task-deep-links";
import { getReopenedTaskProgress, type TaskQuickAction } from "@/lib/task-status-actions";

// Lazy-loaded heavy components
const LogReportModal = dynamic(() => import("@/components/tasks/LogReportModal"), { ssr: false });

import BoardCard from "@/components/tasks/BoardCard";
import TaskListRow from "@/components/tasks/TaskListRow";
import TaskModal from "@/components/tasks/TaskModal";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";

// Map backend status to nice labels
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed"
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
  const { user: currentUser } = useUser();

  // Data from React Query — auto-refetches on socket data:changed events
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();
  const currentUserId = currentUser?.id ? String(currentUser.id) : "";
  const canManageAssignments = canManageTaskAssignments(currentUser);
  const currentUserAssignment = useMemo(
    () => getUserTaskAssignment(currentUser, users),
    [currentUser, users],
  );

  // UI State
  const isLoading = tasksLoading;
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deepLinkFilter, setDeepLinkFilter] = useState<TaskDeepLinkFilter | null>(null);
  const [deepLinkTaskId, setDeepLinkTaskId] = useState<string | null>(null);
  const [taskLinkError, setTaskLinkError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list" | "calendar">('list');

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
  const appliedDefaultUserFilterRef = useRef(false);
  const handledCreateDeepLinkRef = useRef(false);
  const openedDeepLinkTaskRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (appliedDefaultUserFilterRef.current || canManageAssignments || !currentUserId) return;

    setFilterUserId(currentUserId);
    appliedDefaultUserFilterRef.current = true;
  }, [canManageAssignments, currentUserId]);

  // Action hander for Play/Pause/Complete/Reopen
  const handleTaskAction = async (e: React.MouseEvent, taskId: string, action: TaskQuickAction) => {
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
      const newElapsed = (task.totalElapsed || 0) + additionalSecs;
      const autoProgress = task.estimatedTime
        ? Math.min(100, Math.round((newElapsed / (task.estimatedTime * 60)) * 100))
        : 0;
      updates = {
        timerStatus: 'paused',
        timerStart: undefined,
        totalElapsed: newElapsed,
        progress: autoProgress,
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
    } else if (action === 'reopen') {
      updates = {
        status: 'in_progress',
        progress: getReopenedTaskProgress(task),
        timerStatus: 'paused',
        timerStart: undefined,
      };
    }

    try {
      const updatedTask = await updateTask(taskId, updates);
      if (updatedTask) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });
        toast.success(`Task ${action === 'complete' ? 'completed' : action === 'reopen' ? 'reopened' : (action === 'play' ? 'started' : 'paused')}`);
      }
    } catch {
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
  const [progress, setProgress] = useState(0);
  const [progressNotes, setProgressNotes] = useState("");

  function applyCurrentUserAssignment() {
    if (!currentUserId) return;

    setAssigneeId(currentUserId);
    if (currentUserAssignment?.departmentId) {
      setDepartmentId(currentUserAssignment.departmentId);
    }
    if (currentUserAssignment?.role) {
      setRole(currentUserAssignment.role);
    }
  }

  const openNewTask = useCallback(() => {
    setSelectedTask(null);
    setEditTaskData(null);
    setTitle("");
    setDescription("");
    setAssigneeId(canManageAssignments ? "" : currentUserId);
    setDueDate("");
    setStartDate("");
    setPriority("Med");
    setDepartmentId(canManageAssignments ? "" : currentUserAssignment?.departmentId || "");
    setRole(canManageAssignments ? "" : currentUserAssignment?.role || "");
    setStatus("todo");
    setProgress(0);
    setProgressNotes("");
    setEstimatedTime("");
    setShowModal(true);
  }, [
    canManageAssignments,
    currentUserAssignment?.departmentId,
    currentUserAssignment?.role,
    currentUserId,
  ]);

  useEffect(() => {
    if (handledCreateDeepLinkRef.current || typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkState = getTaskDeepLinkState(searchParams);
    setDeepLinkFilter(deepLinkState.filter);
    setDeepLinkTaskId(deepLinkState.taskId);

    if (shouldOpenCreateFromSearch(searchParams)) {
      handledCreateDeepLinkRef.current = true;
      openNewTask();
    }
  }, [openNewTask]);

  function openEdit(task: Task) {
    setSelectedTask(null);
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
    setProgress(task.progress || 0);
    setProgressNotes("");
    setEstimatedTime(task.estimatedTime?.toString() || "");
    setShowModal(true);
  }

  function openTaskDetails(task: Task) {
    setSelectedTask(task);
  }

  function closeTaskDetails() {
    setSelectedTask(null);
  }

  function clearDeepLinkFilter() {
    setDeepLinkFilter(null);

    if (typeof window === "undefined") return;

    const nextUrl = getTaskUrlWithoutDeepLinkFilter(new URLSearchParams(window.location.search));
    window.history.replaceState(null, "", nextUrl);
  }

  function openEditFromDetails(task: Task) {
    setSelectedTask(null);
    openEdit(task);
  }

  useEffect(() => {
    if (!deepLinkTaskId || openedDeepLinkTaskRef.current === deepLinkTaskId) return;

    const localTask = tasks.find((task) => task.id === deepLinkTaskId);
    if (localTask) {
      openedDeepLinkTaskRef.current = deepLinkTaskId;
      setTaskLinkError(null);
      setSelectedTask(localTask);
      return;
    }

    fetchTaskDetail(deepLinkTaskId)
      .then((task) => {
        openedDeepLinkTaskRef.current = deepLinkTaskId;
        setTaskLinkError(null);
        setSelectedTask(task);
      })
      .catch(() => {
        openedDeepLinkTaskRef.current = deepLinkTaskId;
        const message = "Task link is unavailable, deleted, or restricted for your role.";
        setTaskLinkError(message);
        toast.error(message);
      });
  }, [deepLinkTaskId, tasks, toast]);

  function closeModal() {
    setShowModal(false);
    setEditTaskData(null);
  }

  useEffect(() => {
    if (!showModal || editTaskData || canManageAssignments) return;

    if (currentUserId && assigneeId !== currentUserId) {
      setAssigneeId(currentUserId);
    }
    if (currentUserAssignment?.departmentId && departmentId !== currentUserAssignment.departmentId) {
      setDepartmentId(currentUserAssignment.departmentId);
    }
    if (currentUserAssignment?.role && role !== currentUserAssignment.role) {
      setRole(currentUserAssignment.role);
    }
  }, [
    assigneeId,
    canManageAssignments,
    currentUserAssignment?.departmentId,
    currentUserAssignment?.role,
    currentUserId,
    departmentId,
    editTaskData,
    role,
    showModal,
  ]);



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const effectiveAssigneeId = canManageAssignments ? assigneeId : currentUserId;
    const effectiveDepartmentId = canManageAssignments ? departmentId : currentUserAssignment?.departmentId || "";
    const effectiveRole = canManageAssignments ? role : currentUserAssignment?.role || "";

    if (!title.trim() || !description.trim() || !dueDate || !estimatedTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (canManageAssignments && (!effectiveDepartmentId || !effectiveAssigneeId || !effectiveRole)) {
      toast.error(
        "Please choose an assignee, department, and role",
      );
      return;
    }

    if (!canManageAssignments && !editTaskData && (!effectiveDepartmentId || !effectiveAssigneeId || !effectiveRole)) {
      toast.error("Your account needs an assigned department and role before creating tasks");
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
          dueDate,
          startDate: startDate || undefined,
          estimatedTime: parseInt(estimatedTime),
          progress,
        };

        if (canManageAssignments) {
          updates.departmentId = effectiveDepartmentId;
          updates.assigneeId = effectiveAssigneeId;
          updates.role = effectiveRole;
        }

        if (progressNotes.trim()) {
          updates.notes = [
            { text: progressNotes.trim(), date: new Date().toISOString() },
            ...(editTaskData.notes || [])
          ];
        }

        await updateTask(editTaskData.id, updates);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success("Task updated");
      } else {
        // Create new
        await createTask({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          departmentId: effectiveDepartmentId,
          assigneeId: effectiveAssigneeId,
          dueDate,
          startDate: startDate || undefined,
          role: effectiveRole,
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

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering Logic
  const filteredTasks = tasks.filter(t => {
    if (!taskMatchesDeepLinkFilter(t, deepLinkFilter, todayStr)) return false;
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
  const todaysTasks = filteredTasks.filter(t => t.dueDate === todayStr && t.status !== 'completed');
  const overdueTasks = filteredTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed');
  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = filteredTasks.filter(t => t.status === 'review').length;
  const openCount = filteredTasks.filter(t => t.status !== 'completed').length;
  const activeFilterCount = filterStatus.length + filterPriority.length + (filterUserId ? 1 : 0) + (filterDeptId ? 1 : 0);
  const focusTask =
    overdueTasks[0]
    || todaysTasks[0]
    || sortedTasks.find((task) => task.status === 'in_progress')
    || sortedTasks.find((task) => task.status === 'review')
    || sortedTasks.find((task) => task.status === 'todo')
    || null;
  const deepLinkFilterLabel = getTaskFilterLabel(deepLinkFilter);
  const deepLinkFilterDescription = getTaskFilterDescription(deepLinkFilter);

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
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <div className="p-6 pt-0 flex flex-col flex-1 min-h-0">
        <Header
          title="Task Tracking"
          subtitle="Track and manage tasks, assignments, and progress."
        />

        <div className="mt-6 flex flex-col flex-1 min-h-0 gap-4">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--foreground)]">Work focus</div>
                {focusTask ? (
                  <div className="mt-1 min-w-0">
                    <div className="truncate text-lg font-semibold">{focusTask.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span>{STATUS_LABELS[focusTask.status]}</span>
                      <span>{focusTask.priority} priority</span>
                      {focusTask.dueDate ? <span>Due {focusTask.dueDate}</span> : <span>No due date</span>}
                      {focusTask.assignee ? <span>Assigned to {focusTask.assignee.name || focusTask.assignee.email}</span> : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[var(--muted)]">No open tasks in the current view.</p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[28rem]">
                {[
                  { label: "Open", value: openCount },
                  { label: "Overdue", value: overdueTasks.length },
                  { label: "Due today", value: todaysTasks.length },
                  { label: "Review", value: reviewCount },
                ].map((item) => (
                  <div key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2">
                    <div className="text-xs text-[var(--muted)]">{item.label}</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              {focusTask ? (
                <>
                  <Button
                    variant="primary"
                    icon={<CheckSquare className="w-4 h-4" />}
                    onClick={() => openTaskDetails(focusTask)}
                  >
                    Open Focus Task
                  </Button>
                  {focusTask.status !== 'completed' ? (
                    <Button
                      variant="secondary"
                      icon={focusTask.timerStatus === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      onClick={(event) => handleTaskAction(event, focusTask.id, focusTask.timerStatus === 'playing' ? 'pause' : 'play')}
                    >
                      {focusTask.timerStatus === 'playing' ? 'Pause Timer' : 'Start Timer'}
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNewTask}>
                  Create Task
                </Button>
              )}
            </div>
          </section>

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
              className="border-red-700 bg-red-700 text-white hover:bg-red-800"
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
                Organize {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>

              {showDisplayMenu && (
                <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-3rem)] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-30 p-4 dropdown-glass glass overflow-hidden flex flex-col max-h-[85vh] sm:left-0 sm:right-auto">
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-2">
                    <span className="font-bold text-sm">Display & Filter</span>
                    <button
                      className="text-[10px] text-[var(--accent)] hover:underline uppercase font-bold"
                      onClick={() => {
                        setFilterStatus([]);
                        setFilterPriority([]);
                        setFilterUserId(!canManageAssignments && currentUserId ? currentUserId : "");
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
                            className={`px-3 py-2 text-xs rounded border transition-[background-color,border-color,color] flex items-center justify-between ${sortBy === opt.val
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
                            className={`px-3 py-2 text-xs rounded border transition-[background-color,border-color,color] flex items-center justify-between ${groupBy === opt.val
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

            <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
              <div className="relative mr-2 w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                <input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-10 w-full rounded-full border border-[var(--border)] bg-[var(--card-bg)] py-2 pl-8 pr-3 text-sm outline-none transition-[border-color,box-shadow] focus:ring-1 focus:ring-[var(--accent)] sm:w-56"
                />
              </div>
              <Button
                onClick={() => setView("list")}
                aria-label="Show tasks as a list"
                aria-pressed={view === "list"}
                title="List view"
                variant={view === "list" ? "primary" : "secondary"}
                icon={<List className="w-4 h-4" />}
                size="sm"
              />
              <Button
                onClick={() => setView("grid")}
                aria-label="Show tasks as cards"
                aria-pressed={view === "grid"}
                title="Card view"
                variant={view === "grid" ? "primary" : "secondary"}
                icon={<Grid className="w-4 h-4" />}
                size="sm"
              />
              <Button
                onClick={() => setView("calendar")}
                aria-label="Show tasks on the calendar"
                aria-pressed={view === "calendar"}
                title="Calendar view"
                variant={view === "calendar" ? "primary" : "secondary"}
                icon={<CalendarIcon className="w-4 h-4" />}
                size="sm"
              />
            </div>
          </div>

          {(deepLinkFilterLabel || taskLinkError) && (
            <div className="mb-4 space-y-2">
              {deepLinkFilterLabel && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-sky-700 dark:text-sky-300">
                      {deepLinkFilterLabel}
                    </div>
                    {deepLinkFilterDescription && (
                      <div className="mt-0.5 text-xs text-sky-700/80 dark:text-sky-300/80">
                        {deepLinkFilterDescription} {sortedTasks.length} result{sortedTasks.length === 1 ? "" : "s"}.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearDeepLinkFilter}
                    className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filter
                  </button>
                </div>
              )}

              {taskLinkError && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  <span>{taskLinkError}</span>
                  <button
                    type="button"
                    onClick={() => setTaskLinkError(null)}
                    className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium transition hover:bg-amber-500/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}

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
                                  onClick={() => openTaskDetails(t)}
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
                    <TaskListRow
                      key={t.id}
                      task={t}
                      onClick={() => openTaskDetails(t)}
                      onAction={handleTaskAction}
                    />
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
              onOpenTask={openTaskDetails}
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
          progress={progress} setProgress={setProgress}
          progressNotes={progressNotes} setProgressNotes={setProgressNotes}
          departments={departments} users={users}
          canManageAssignments={canManageAssignments}
          assignmentSummary={{
            assigneeName: currentUser?.name || currentUser?.email || "You",
            departmentName: currentUserAssignment?.departmentName,
            role: currentUserAssignment?.role,
            isReady: Boolean(currentUserId && currentUserAssignment?.departmentId && currentUserAssignment?.role),
          }}
          onAssignToCurrentUser={applyCurrentUserAssignment}
          onSubmit={handleSubmit} onDelete={handleDelete} onClose={closeModal}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={closeTaskDetails}
          onEdit={openEditFromDetails}
          onAction={handleTaskAction}
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
