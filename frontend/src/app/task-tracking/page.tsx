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
  FolderKanban,
  Maximize2,
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
  type TaskProject,
  type TaskProjectStatus,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskPayload,
} from "@/lib/tasks";
import {
  useTasks,
  useUsers,
  useDepartments,
  useTaskProjects,
  useCreateTaskProject,
  useUpdateTaskProject,
} from "@/hooks/useTasksQuery";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import {
  canManageTaskAssignments,
  getPrimaryTaskAssignmentFromRoles,
  getUserTaskAssignment,
} from "@/lib/task-access";
import { shouldOpenCreateFromSearch } from "@/lib/dashboard-deep-links";
import {
  getTaskDeepLinkState,
  getTaskFilterDescription,
  getTaskFilterLabel,
  getTaskViewFromSearch,
  getTaskUrlWithoutDeepLinkFilter,
  taskMatchesDeepLinkFilter,
  type TaskDeepLinkFilter,
  type TaskViewPreference,
} from "@/lib/task-deep-links";
import {
  getSelectedFocusTask,
  getTaskFocusStorageKey,
} from "@/lib/task-focus";
import { taskMatchesSearchQuery } from "@/lib/task-search";
import { getReopenedTaskProgress, type TaskQuickAction } from "@/lib/task-status-actions";
import { formatEstimatedMinutesAsClock, parseEstimatedClockToMinutes } from "@/lib/task-estimate";
import { getInternalOperationsMembers } from "@/lib/member-role-management";

// Lazy-loaded heavy components
const LogReportModal = dynamic(() => import("@/components/tasks/LogReportModal"), { ssr: false });

import BoardCard from "@/components/tasks/BoardCard";
import TaskListRow from "@/components/tasks/TaskListRow";
import TaskModal from "@/components/tasks/TaskModal";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import ProjectOverviewModal from "@/components/tasks/ProjectOverviewModal";
import CreateProjectModal from "@/components/tasks/CreateProjectModal";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

// Map backend status to nice labels
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed"
};
const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "review"];
const PROJECT_STATUS_LABELS: Record<TaskProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

const formatMinutes = (minutes: number) => {
  if (!minutes) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
};

function getTaskFocusOptionLabel(task: Task): string {
  const metadata = [
    STATUS_LABELS[task.status],
    task.project?.name,
    task.assignee?.name || task.assignee?.email,
    task.dueDate ? `Due ${task.dueDate}` : null,
  ].filter(Boolean).join(" - ");

  return metadata ? `${task.title} - ${metadata}` : task.title;
}

function replaceTaskInQueryData(currentData: unknown, updatedTask: Task) {
  if (Array.isArray(currentData)) {
    return currentData.map((task) => task.id === updatedTask.id ? updatedTask : task);
  }

  if (
    currentData &&
    typeof currentData === "object" &&
    "data" in currentData &&
    Array.isArray((currentData as { data?: unknown }).data)
  ) {
    return {
      ...currentData,
      data: (currentData as { data: Task[] }).data.map((task) => task.id === updatedTask.id ? updatedTask : task),
    };
  }

  return currentData;
}

export default function TaskTrackingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useUser();

  // Data from React Query — auto-refetches on socket data:changed events
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();
  const { data: projects = [] } = useTaskProjects();
  const createProjectMutation = useCreateTaskProject();
  const updateProjectMutation = useUpdateTaskProject();
  const currentUserId = currentUser?.id ? String(currentUser.id) : "";
  const canManageAssignments = canManageTaskAssignments(currentUser);
  const currentUserAssignment = useMemo(
    () => getUserTaskAssignment(currentUser, users),
    [currentUser, users],
  );
  const internalProjectMembers = useMemo(
    () => getInternalOperationsMembers(users),
    [users],
  );

  // UI State
  const isLoading = tasksLoading;
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deepLinkFilter, setDeepLinkFilter] = useState<TaskDeepLinkFilter | null>(null);
  const [deepLinkTaskId, setDeepLinkTaskId] = useState<string | null>(null);
  const [taskLinkError, setTaskLinkError] = useState<string | null>(null);
  const [view, setView] = useState<TaskViewPreference>('list');

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState<TaskStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<TaskPriority[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | string>("");
  const [filterDeptId, setFilterDeptId] = useState<string>("");
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title" | "status">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "department" | "assignee" | "project" | "none">("status");

  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [showEODModal, setShowEODModal] = useState(false);
  const [showProjectOverview, setShowProjectOverview] = useState(false);
  const [showProjectCreateModal, setShowProjectCreateModal] = useState(false);
  const [pinnedFocusTaskId, setPinnedFocusTaskId] = useState<string | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const appliedDefaultUserFilterRef = useRef(false);
  const handledCreateDeepLinkRef = useRef(false);
  const openedDeepLinkTaskRef = useRef<string | null>(null);
  const focusStorageKey = useMemo(
    () => getTaskFocusStorageKey(currentUserId),
    [currentUserId],
  );
  const closeDisplayMenu = useCallback(() => setShowDisplayMenu(false), []);

  useEscapeToClose({ isOpen: showDisplayMenu, onClose: closeDisplayMenu });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPinnedFocusTaskId(window.localStorage.getItem(focusStorageKey));
  }, [focusStorageKey]);

  const savePinnedFocusTask = useCallback((taskId: string | null) => {
    setPinnedFocusTaskId(taskId);

    if (typeof window === "undefined") return;

    if (taskId) {
      window.localStorage.setItem(focusStorageKey, taskId);
    } else {
      window.localStorage.removeItem(focusStorageKey);
    }
  }, [focusStorageKey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (displayRef.current && !displayRef.current.contains(event.target as Node)) {
        closeDisplayMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeDisplayMenu]);


  // Load initial data
  useEffect(() => {
    // Load preference immediately to avoid flash
    const requestedView = typeof window === "undefined"
      ? null
      : getTaskViewFromSearch(new URLSearchParams(window.location.search));
    setView(requestedView || getTaskViewPreference());
  }, []);

  useEffect(() => {
    if (appliedDefaultUserFilterRef.current || canManageAssignments || !currentUserId) return;

    setFilterUserId(currentUserId);
    appliedDefaultUserFilterRef.current = true;
  }, [canManageAssignments, currentUserId]);

  // Action hander for Play/Pause/Complete
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
        queryClient.setQueriesData({ queryKey: ['tasks'] }, (currentData) =>
          replaceTaskInQueryData(currentData, updatedTask),
        );
        queryClient.setQueryData(['tasks', 'detail', taskId], (currentData: Task | undefined) => ({
          ...currentData,
          ...updatedTask,
          workSessions: updatedTask.workSessions ?? currentData?.workSessions,
        }));
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
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Med");
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [estimatedTime, setEstimatedTime] = useState<string>("");

  const [editTaskData, setEditTaskData] = useState<Task | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressNotes, setProgressNotes] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTargetDate, setProjectTargetDate] = useState("");
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);

  function applyCurrentUserAssignment() {
    if (!currentUserId) return;

    setAssigneeId(currentUserId);
    setDepartmentId(currentUserAssignment?.departmentId || "");
    setRole(currentUserAssignment?.role || "");
  }

  const openNewTask = useCallback(() => {
    setSelectedTask(null);
    setEditTaskData(null);
    setTitle("");
    setDescription("");
    setAssigneeId(canManageAssignments ? "" : currentUserId);
    setCollaboratorIds([]);
    setDueDate("");
    setStartDate("");
    setPriority("Med");
    setDepartmentId(canManageAssignments ? "" : currentUserAssignment?.departmentId || "");
    setProjectId("");
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

  const openNewTaskForDate = useCallback((date: string) => {
    openNewTask();
    setStartDate(date);
    setDueDate(date);
  }, [openNewTask]);

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
    setCollaboratorIds((task.collaborators || []).map((collaborator) => collaborator.userId));
    setDueDate(task.dueDate || "");
    setStartDate(task.startDate || "");
    setPriority(task.priority);
    setDepartmentId(task.departmentId || "");
    setProjectId(task.projectId || "");
    setRole(task.role || "");
    setStatus(task.status);
    setProgress(task.progress || 0);
    setProgressNotes("");
    setEstimatedTime(formatEstimatedMinutesAsClock(task.estimatedTime));
    setShowModal(true);
  }

  function openTaskDetails(task: Task) {
    setSelectedTask(task);
  }

  function closeTaskDetails() {
    setSelectedTask(null);
  }

  function openProjectOverview() {
    setShowProjectOverview(true);
  }

  function closeProjectOverview() {
    setShowProjectOverview(false);
  }

  function resetProjectForm() {
    setProjectName("");
    setProjectDescription("");
    setProjectTargetDate("");
    setProjectMemberIds([]);
  }

  function openProjectCreateModal() {
    setShowProjectCreateModal(true);
  }

  function closeProjectCreateModal() {
    setShowProjectCreateModal(false);
    resetProjectForm();
  }

  function handleProjectPanelClick(event: React.MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) {
      openProjectOverview();
      return;
    }

    if (target.closest("button, input, select, textarea, form, a")) return;
    openProjectOverview();
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

  useEffect(() => {
    if (!filterProjectId) return;

    function handleProjectFilterEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (showModal || selectedTask || showEODModal || showDisplayMenu || showProjectOverview || showProjectCreateModal) return;

      event.preventDefault();
      setFilterProjectId("");
    }

    document.addEventListener("keydown", handleProjectFilterEscape);
    return () => document.removeEventListener("keydown", handleProjectFilterEscape);
  }, [filterProjectId, selectedTask, showDisplayMenu, showEODModal, showModal, showProjectCreateModal, showProjectOverview]);



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const effectiveAssigneeId = canManageAssignments ? assigneeId : currentUserId;
    const selectedAssignee = users.find((user) => String(user.id) === String(effectiveAssigneeId));
    const selectedAssigneeAssignment = getPrimaryTaskAssignmentFromRoles(selectedAssignee?.roles);
    const effectiveDepartmentId = canManageAssignments
      ? selectedAssigneeAssignment?.departmentId || (editTaskData ? departmentId : "")
      : currentUserAssignment?.departmentId || "";
    const effectiveRole = canManageAssignments
      ? selectedAssigneeAssignment?.role || (editTaskData ? role : "")
      : currentUserAssignment?.role || "";
    const estimatedTimeMinutes = parseEstimatedClockToMinutes(estimatedTime);

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!estimatedTimeMinutes) {
      toast.error("Enter ETOC as HH:MM, for example 01:30");
      return;
    }

    if (canManageAssignments && (!effectiveAssigneeId || !effectiveDepartmentId || !effectiveRole)) {
      toast.error("Choose an assignee with an assigned department and role in their account");
      return;
    }

    if (!canManageAssignments && !editTaskData && (!effectiveDepartmentId || !effectiveAssigneeId || !effectiveRole)) {
      toast.error("Your account needs an assigned department and role before creating tasks");
      return;
    }

    try {
      if (editTaskData) {
        // Update existing
        const updates: UpdateTaskPayload = {
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          projectId: projectId || null,
          dueDate: dueDate || null,
          startDate: startDate || null,
          estimatedTime: estimatedTimeMinutes,
          progress,
        };

        if (canManageAssignments) {
          updates.departmentId = effectiveDepartmentId;
          updates.assigneeId = effectiveAssigneeId;
          updates.role = effectiveRole || undefined;
          updates.collaboratorIds = collaboratorIds;
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
          projectId: projectId || undefined,
          collaboratorIds: canManageAssignments ? collaboratorIds : undefined,
          dueDate: dueDate || undefined,
          startDate: startDate || undefined,
          role: effectiveRole || undefined,
          notes: [],
          estimatedTime: estimatedTimeMinutes,
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

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    const submittedMemberIds = Array.from(
      new FormData(event.currentTarget).getAll("projectMemberIds"),
    )
      .map((value) => String(value))
      .filter(Boolean);

    try {
      const project = await createProjectMutation.mutateAsync({
        name: projectName.trim(),
        description: projectDescription.trim() || null,
        status: "active",
        departmentId: null,
        memberIds: submittedMemberIds,
        targetDate: projectTargetDate || null,
      });
      closeProjectCreateModal();
      setFilterProjectId(project.id);
      toast.success("Project created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    }
  }

  async function handleProjectStatus(project: TaskProject, status: TaskProjectStatus) {
    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        data: {
          status,
          completedAt: status === "completed" ? new Date().toISOString() : null,
        },
      });
      toast.success(`Project marked ${PROJECT_STATUS_LABELS[status].toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    }
  }

  function toggleProjectTaskView(projectId: string) {
    setFilterProjectId((currentProjectId) => (currentProjectId === projectId ? "" : projectId));
  }

  const handleDownloadPDF = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF('landscape');
      const generatedAt = new Date();
      const generatedBy = currentUser?.name || currentUser?.email || "Unknown user";
      const generatedAtLabel = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(generatedAt);

      doc.setFontSize(20);
      doc.text("Deskii Report", 14, 15);

      doc.setFontSize(10);
      doc.text(`Generated by: ${generatedBy}`, 14, 23);
      doc.text(`Generated at: ${generatedAtLabel}`, 14, 29);
      doc.text(`Tasks included: ${sortedTasks.length}`, 14, 35);

      const tableColumn = ["Task Name", "Status", "Priority", "Project", "Department", "Assignee", "Start Date", "Due Date", "Progress", "ETOC", "Creator"];
      const tableRows: string[][] = [];

      sortedTasks.forEach(task => {
        const taskData = [
          task.title,
          STATUS_LABELS[task.status] || task.status,
          task.priority,
          task.project?.name || "No project",
          task.department?.name || "N/A",
          task.assignee?.name || task.assignee?.email || "Unassigned",
          task.startDate || "-",
          task.dueDate || "No due date",
          `${task.progress || 0}%`,
          task.estimatedTime ? formatMinutes(task.estimatedTime) : "-",
          task.creator?.name || task.creator?.email || "Unknown",
        ];
        tableRows.push(taskData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 42,
        theme: 'grid',
        headStyles: { fillColor: [23, 217, 245], textColor: [4, 16, 24] },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { top: 42 },
      });

      const filename = `Deskii_Report_${generatedAt.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      toast.success("Deskii report generated successfully");
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
    if (filterProjectId && (t.projectId || "") !== filterProjectId) return false;
    if (!taskMatchesSearchQuery(t, searchQuery)) return false;
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
  } else if (groupBy === "project") {
    columns = projects.map(project => ({
      id: project.id,
      label: project.name,
      items: sortedTasks.filter(t => t.projectId === project.id)
    }));
    columns.push({
      id: 'no-project',
      label: 'No Project',
      items: sortedTasks.filter(t => !t.projectId)
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
  const activeFilterCount = filterStatus.length + filterPriority.length + (filterUserId ? 1 : 0) + (filterDeptId ? 1 : 0) + (filterProjectId ? 1 : 0);
  const isCompletedOnlyFilter = filterStatus.length === 1 && filterStatus[0] === "completed";
  const isOpenOnlyFilter = OPEN_TASK_STATUSES.every((statusOption) => filterStatus.includes(statusOption)) && filterStatus.length === OPEN_TASK_STATUSES.length;
  const focusCandidateTasks = sortedTasks.filter((task) => task.status !== "completed");
  const focusSelection = getSelectedFocusTask(tasks, focusCandidateTasks, pinnedFocusTaskId, todayStr);
  const focusTask = focusSelection.task;
  const focusSelectTasks = focusTask && !focusCandidateTasks.some((task) => task.id === focusTask.id)
    ? [focusTask, ...focusCandidateTasks]
    : focusCandidateTasks;
  const selectedProject = filterProjectId
    ? projects.find((project) => project.id === filterProjectId)
    : null;
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
    return (
      <main className="min-h-[calc(100dvh-112px)] overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
        <div className="motion-content-enter flex min-h-0 flex-col p-6 pt-0">
          <Header
            title="Task Tracking"
            subtitle="Track and manage tasks, assignments, and progress."
          />

          <div className="mt-6 flex flex-col gap-4">
            <TaskBoardSkeleton includeHeader={false} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-112px)] overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="motion-content-enter flex min-h-0 flex-col p-6 pt-0">
        <Header
          title="Task Tracking"
          subtitle="Track and manage tasks, assignments, and progress."
        />

        <div className="mt-6 flex flex-col gap-4 pb-8">
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
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label htmlFor="task-focus-select" className="sr-only">Focus task</label>
                  <select
                    id="task-focus-select"
                    value={focusSelection.mode === "pinned" ? pinnedFocusTaskId || "" : ""}
                    onChange={(event) => savePinnedFocusTask(event.target.value || null)}
                    className="min-h-10 w-full max-w-md rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
                    aria-label="Choose focus task"
                  >
                    <option value="">
                      {focusSelection.mode === "auto" ? `Auto: ${focusTask?.title || "No open task"}` : "Auto focus"}
                    </option>
                    {focusSelectTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {getTaskFocusOptionLabel(task)}
                      </option>
                    ))}
                  </select>
                  {pinnedFocusTaskId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<X className="w-4 h-4" />}
                      onClick={() => savePinnedFocusTask(null)}
                    >
                      Clear focus
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-5 xl:min-w-[34rem]">
                {[
                  { label: "Open", value: openCount },
                  { label: "Overdue", value: overdueTasks.length },
                  { label: "Due today", value: todaysTasks.length },
                  { label: "Review", value: reviewCount },
                  { label: "Completed", value: completedCount },
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

          <section
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4"
            onClick={handleProjectPanelClick}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <button
                type="button"
                onClick={openProjectOverview}
                className="-m-2 max-w-xl rounded-md p-2 text-left transition hover:bg-[var(--card-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Open expanded project overview"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <FolderKanban className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                  Project organization
                  <Maximize2 className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Assign tasks to projects, then track each project until completion.
                </span>
              </button>

              {canManageAssignments && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Plus className="w-4 h-4" aria-hidden="true" />}
                  onClick={openProjectCreateModal}
                  disabled={createProjectMutation.isPending}
                  className="self-start xl:self-center"
                >
                  Add Project
                </Button>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {projects.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card-surface)] p-4 text-sm text-[var(--muted)]">
                  No task projects yet.
                </div>
              ) : (
                projects.slice(0, 8).map((project) => {
                  const taskCount = project.taskCount ?? tasks.filter((task) => task.projectId === project.id).length;
                  const isViewingProject = filterProjectId === project.id;
                  return (
                    <article
                      key={project.id}
                      className={`relative overflow-hidden rounded-md border p-3 transition-[background-color,border-color,box-shadow] duration-150 ${
                        isViewingProject
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[inset_0_0_0_1px_rgba(23,217,245,0.16)]"
                          : "border-[var(--border)] bg-[var(--card-surface)] hover:border-[var(--accent)]/50 hover:bg-[var(--card-bg)]"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={isViewingProject}
                        aria-label={isViewingProject ? `Exit ${project.name} project task view` : `View tasks in ${project.name}`}
                        title={isViewingProject ? "Back to all tasks" : "View project tasks"}
                        onClick={() => toggleProjectTaskView(project.id)}
                        className="absolute inset-0 z-10 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]"
                      />
                      <div className="pointer-events-none relative z-20 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{project.name}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {taskCount} task{taskCount === 1 ? "" : "s"} - {PROJECT_STATUS_LABELS[project.status]}
                            </div>
                          </div>
                          {isViewingProject ? (
                            <span className="shrink-0 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-semibold uppercase text-[var(--accent)]">
                              Viewing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-[var(--muted)]">
                          {project.department?.name && <span>{project.department.name}</span>}
                          {project.targetDate && <span>Target {project.targetDate}</span>}
                        </div>
                        {project.members && project.members.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1" aria-label={`${project.name} project members`}>
                            {project.members.slice(0, 4).map((member) => (
                              <span
                                key={member.id}
                                className="max-w-28 truncate rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--muted)]"
                                title={member.user?.name || member.user?.email || "Project member"}
                              >
                                {member.user?.name || member.user?.email || "Member"}
                              </span>
                            ))}
                            {project.members.length > 4 ? (
                              <span className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--muted)]">
                                +{project.members.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {canManageAssignments && (
                        <div className="relative z-30 mt-3 flex flex-wrap gap-2">
                          {project.status !== "completed" ? (
                            <button
                              type="button"
                              onClick={() => handleProjectStatus(project, "completed")}
                              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleProjectStatus(project, "active")}
                              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            >
                              Reopen
                            </button>
                          )}
                          {project.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => handleProjectStatus(project, "paused")}
                              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                            >
                              Pause
                            </button>
                          ) : project.status === "paused" ? (
                            <button
                              type="button"
                              onClick={() => handleProjectStatus(project, "active")}
                              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            >
                              Resume
                            </button>
                          ) : null}
                        </div>
                      )}
                    </article>
                  );
                })
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

            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-1">
              <button
                type="button"
                className={`motion-interactive min-h-10 rounded-[var(--radius-sm)] px-3 text-xs font-semibold ${filterStatus.length === 0 ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)]"}`}
                onClick={() => setFilterStatus([])}
              >
                All Tasks
              </button>
              <button
                type="button"
                className={`motion-interactive min-h-10 rounded-[var(--radius-sm)] px-3 text-xs font-semibold ${isOpenOnlyFilter ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)]"}`}
                onClick={() => setFilterStatus(OPEN_TASK_STATUSES)}
              >
                Open
              </button>
              <button
                type="button"
                className={`motion-interactive min-h-10 rounded-[var(--radius-sm)] px-3 text-xs font-semibold ${isCompletedOnlyFilter ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)]"}`}
                onClick={() => setFilterStatus(["completed"])}
              >
                Completed
              </button>
            </div>

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
                variant={(filterStatus.length || filterPriority.length || filterUserId || filterDeptId || filterProjectId) ? "primary" : "secondary"}
                icon={<ArrowUpDown className="w-4 h-4" />}
                onClick={() => setShowDisplayMenu(!showDisplayMenu)}
                className="min-w-[120px]"
              >
                Organize {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>

              {showDisplayMenu && (
                <div className="motion-panel-in fixed bottom-6 left-4 right-4 top-28 z-30 flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-xl dropdown-glass glass sm:left-auto sm:right-6 sm:w-80">
                  <div className="mb-4 flex shrink-0 items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="font-bold text-sm">Display & Filter</span>
                    <button
                      className="text-[10px] text-[var(--accent)] hover:underline uppercase font-bold"
                      onClick={() => {
                        setFilterStatus([]);
                        setFilterPriority([]);
                        setFilterUserId(!canManageAssignments && currentUserId ? currentUserId : "");
                        setFilterDeptId("");
                        setFilterProjectId("");
                        setSortBy("dueDate");
                        setSortOrder("asc");
                        setGroupBy("status");
                      }}
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="chat-scroll min-h-0 flex-1 overflow-y-auto pr-1">
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
                            className={`motion-interactive px-3 py-2 text-xs rounded border flex items-center justify-between ${sortBy === opt.val
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
                          { val: "project", label: "Project" },
                          { val: "none", label: "No Grouping" },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setGroupBy(opt.val as any)}
                            className={`motion-interactive px-3 py-2 text-xs rounded border flex items-center justify-between ${groupBy === opt.val
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

                      <div>
                        <label htmlFor="filter-project" className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-1">Project</label>
                        <select
                          id="filter-project"
                          value={filterProjectId}
                          onChange={(e) => setFilterProjectId(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-1.5 text-xs"
                        >
                          <option value="">All Projects</option>
                          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
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
                  placeholder="Search tasks, people, projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="motion-interactive min-h-10 w-48 rounded-full border border-[var(--border)] bg-[var(--card-bg)] py-2 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  aria-label="Search tasks, people, projects, departments, dates, notes, and status"
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

          {filterProjectId && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-semibold text-[var(--foreground)]">Viewing project tasks</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">
                  {selectedProject?.name || "Selected project"} - {sortedTasks.length} result{sortedTasks.length === 1 ? "" : "s"}. Click the project card again or press Esc to return.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilterProjectId("")}
                className="inline-flex min-h-9 items-center gap-1 rounded border border-[var(--accent)]/40 bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--surface-hover)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Back to all tasks
              </button>
            </div>
          )}

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
            <div key="task-grid-view" className="motion-view-enter min-h-[28rem] overflow-hidden">
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
                <div className="overflow-x-auto chat-scroll pb-3">
                  <div className="flex min-w-max items-stretch gap-4">
                    {columns.map(col => (
                      <div className="flex min-h-[28rem] w-[300px] flex-col" key={col.id}>
                        <Card className="flex min-h-[28rem] flex-col overflow-hidden bg-[var(--card-bg)] shadow-sm border-[var(--border)]">
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
                          <div className="max-h-[34rem] min-h-[20rem] flex-1 overflow-y-auto bg-[var(--card-surface)] p-3 chat-scroll scroll-smooth">
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
            <div key="task-list-view" className="motion-view-enter pb-6">
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
            <div key="task-calendar-view" className="motion-view-enter pb-6">
              <TaskCalendarView
                events={events}
                todaysTasks={todaysTasks}
                overdueTasks={overdueTasks}
                totalCount={filteredTasks.length}
                completedCount={completedCount}
                inProgressCount={inProgressCount}
                onOpenTask={openTaskDetails}
                onCreateTaskForDate={openNewTaskForDate}
              />
            </div>
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
          collaboratorIds={collaboratorIds} setCollaboratorIds={setCollaboratorIds}
          dueDate={dueDate} setDueDate={setDueDate}
          startDate={startDate} setStartDate={setStartDate}
          priority={priority} setPriority={setPriority}
          setDepartmentId={setDepartmentId}
          projectId={projectId} setProjectId={setProjectId}
          setRole={setRole}
          status={status} setStatus={setStatus}
          estimatedTime={estimatedTime} setEstimatedTime={setEstimatedTime}
          progress={progress}
          progressNotes={progressNotes} setProgressNotes={setProgressNotes}
          users={users} projects={projects}
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

      <ProjectOverviewModal
        isOpen={showProjectOverview}
        projects={projects}
        tasks={tasks}
        todayStr={todayStr}
        filterProjectId={filterProjectId}
        canManageAssignments={canManageAssignments}
        onClose={closeProjectOverview}
        onToggleProject={toggleProjectTaskView}
        onProjectStatus={handleProjectStatus}
      />

      <CreateProjectModal
        isOpen={showProjectCreateModal}
        projectName={projectName}
        projectDescription={projectDescription}
        projectTargetDate={projectTargetDate}
        projectMemberIds={projectMemberIds}
        users={internalProjectMembers}
        isSubmitting={createProjectMutation.isPending}
        onProjectNameChange={setProjectName}
        onProjectDescriptionChange={setProjectDescription}
        onProjectTargetDateChange={setProjectTargetDate}
        onProjectMemberIdsChange={setProjectMemberIds}
        onSubmit={handleCreateProject}
        onClose={closeProjectCreateModal}
      />

      {/* Log Report Modal */}
      <LogReportModal
        isOpen={showEODModal}
        onClose={() => setShowEODModal(false)}
        tasks={tasks}
      />
    </main>
  );
}
