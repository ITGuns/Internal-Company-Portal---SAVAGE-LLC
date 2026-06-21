import type { Task, TaskCollaborator } from "./tasks";

export type TaskInviteResponseStatus = "accepted" | "declined";

export function getPendingTaskInviteForUser(
  task: Pick<Task, "collaborators">,
  currentUserId?: string | number | null,
): TaskCollaborator | null {
  if (currentUserId === undefined || currentUserId === null || currentUserId === "") return null;

  const userId = String(currentUserId);
  return task.collaborators?.find((collaborator) =>
    String(collaborator.userId) === userId && collaborator.status === "invited"
  ) || null;
}
