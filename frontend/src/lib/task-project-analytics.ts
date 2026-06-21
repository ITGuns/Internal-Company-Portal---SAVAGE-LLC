import type { Task, TaskProject } from "@/lib/tasks";

export interface TaskProjectAnalytics {
  project: TaskProject;
  tasks: Task[];
  taskCount: number;
  visibleTaskCount: number;
  openCount: number;
  completedCount: number;
  inProgressCount: number;
  reviewCount: number;
  overdueCount: number;
  dueTodayCount: number;
  highPriorityCount: number;
  completionRate: number;
  estimatedMinutes: number;
  trackedSeconds: number;
  remainingMinutes: number;
  nextDueDate: string | null;
  targetOverdue: boolean;
}

export interface TaskProjectAnalyticsSummary {
  totalProjects: number;
  activeProjects: number;
  pausedProjects: number;
  completedProjects: number;
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  averageCompletionRate: number;
}

function matchesProject(task: Task, projectId: string): boolean {
  return (task.projectId || task.project?.id || "") === projectId;
}

function getNextDueDate(tasks: Task[], todayStr: string): string | null {
  const futureDueDates = tasks
    .filter((task) => task.status !== "completed" && task.dueDate && task.dueDate >= todayStr)
    .map((task) => task.dueDate as string)
    .sort();

  return futureDueDates[0] || null;
}

export function buildTaskProjectAnalytics(
  projects: TaskProject[],
  tasks: Task[],
  todayStr: string,
): TaskProjectAnalytics[] {
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => matchesProject(task, project.id));
    const backendTaskCount = project.taskCount ?? 0;
    const taskCount = Math.max(backendTaskCount, projectTasks.length);
    const completedCount = projectTasks.filter((task) => task.status === "completed").length;
    const inProgressCount = projectTasks.filter((task) => task.status === "in_progress").length;
    const reviewCount = projectTasks.filter((task) => task.status === "review").length;
    const openCount = projectTasks.filter((task) => task.status !== "completed").length;
    const overdueCount = projectTasks.filter((task) => task.status !== "completed" && Boolean(task.dueDate) && task.dueDate! < todayStr).length;
    const dueTodayCount = projectTasks.filter((task) => task.status !== "completed" && task.dueDate === todayStr).length;
    const highPriorityCount = projectTasks.filter((task) => task.status !== "completed" && task.priority === "High").length;
    const estimatedMinutes = projectTasks.reduce((total, task) => total + (task.estimatedTime || 0), 0);
    const trackedSeconds = projectTasks.reduce((total, task) => total + (task.totalElapsed || 0), 0);
    const trackedMinutes = Math.floor(trackedSeconds / 60);
    const remainingMinutes = Math.max(0, estimatedMinutes - trackedMinutes);
    const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    return {
      project,
      tasks: projectTasks,
      taskCount,
      visibleTaskCount: projectTasks.length,
      openCount,
      completedCount,
      inProgressCount,
      reviewCount,
      overdueCount,
      dueTodayCount,
      highPriorityCount,
      completionRate,
      estimatedMinutes,
      trackedSeconds,
      remainingMinutes,
      nextDueDate: getNextDueDate(projectTasks, todayStr),
      targetOverdue: project.status !== "completed" && Boolean(project.targetDate) && project.targetDate! < todayStr,
    };
  });
}

export function summarizeTaskProjectAnalytics(analytics: TaskProjectAnalytics[]): TaskProjectAnalyticsSummary {
  const totalCompletion = analytics.reduce((total, item) => total + item.completionRate, 0);

  return {
    totalProjects: analytics.length,
    activeProjects: analytics.filter((item) => item.project.status === "active").length,
    pausedProjects: analytics.filter((item) => item.project.status === "paused").length,
    completedProjects: analytics.filter((item) => item.project.status === "completed").length,
    totalTasks: analytics.reduce((total, item) => total + item.taskCount, 0),
    openTasks: analytics.reduce((total, item) => total + item.openCount, 0),
    overdueTasks: analytics.reduce((total, item) => total + item.overdueCount, 0),
    dueTodayTasks: analytics.reduce((total, item) => total + item.dueTodayCount, 0),
    averageCompletionRate: analytics.length > 0 ? Math.round(totalCompletion / analytics.length) : 0,
  };
}
