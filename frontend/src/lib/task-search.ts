import type { Task, TaskProject, TaskUser } from "./tasks";

type TaskSearchRole = string | {
  role?: string | null;
  department?: { name?: string | null } | null;
} | null | undefined;

type TaskSearchUser = Pick<TaskUser, "name" | "email" | "role"> & {
  roles?: TaskSearchRole[] | null;
};

function normalizeSearchValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function pushUserSearchValues(values: string[], user?: TaskSearchUser | null) {
  if (!user) return;

  values.push(user.name || "", user.email || "", user.role || "");
  user.roles?.forEach((role) => {
    if (typeof role === "string") {
      values.push(role);
      return;
    }

    values.push(role?.role || "", role?.department?.name || "");
  });
}

function pushProjectSearchValues(values: string[], project?: TaskProject | null) {
  if (!project) return;

  values.push(
    project.name,
    project.description || "",
    project.status,
    project.department?.name || "",
    project.owner?.name || "",
    project.owner?.email || "",
    project.creator?.name || "",
    project.creator?.email || "",
  );
}

export function buildTaskSearchText(task: Task): string {
  const values: string[] = [
    task.id,
    task.title,
    task.description || "",
    task.status,
    task.priority,
    task.role || "",
    task.department?.name || "",
    task.projectId || "",
    task.dueDate || "",
    task.startDate || "",
    task.completedAt || "",
  ];

  pushUserSearchValues(values, task.assignee);
  pushUserSearchValues(values, task.creator);
  task.collaborators?.forEach((collaborator) => {
    values.push(collaborator.status, collaborator.invitedById || "");
    pushUserSearchValues(values, collaborator.user);
    pushUserSearchValues(values, collaborator.invitedBy);
  });
  pushProjectSearchValues(values, task.project);
  task.notes?.forEach((note) => values.push(note.text, note.date));

  return normalizeSearchValue(values.join(" "));
}

export function taskMatchesSearchQuery(task: Task, query: string): boolean {
  const terms = normalizeSearchValue(query)
    .split(" ")
    .filter(Boolean);

  if (terms.length === 0) return true;

  const searchText = buildTaskSearchText(task);
  return terms.every((term) => searchText.includes(term));
}
