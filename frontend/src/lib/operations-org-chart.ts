import { getMemberDisplayName, type OperationsMember } from "./member-role-management";

export type OperationsOrgChartNode = {
  member: OperationsMember;
  reports: OperationsOrgChartNode[];
  isCycle?: boolean;
};

export type OperationsOrgChartRowNode = {
  member: OperationsMember;
  reports: OperationsOrgChartNode[];
  depth: number;
  isCycle: boolean;
  directReportCount: number;
};

export type OperationsOrgChartRow = {
  depth: number;
  nodes: OperationsOrgChartRowNode[];
};

function sortMembersByDisplayName(members: OperationsMember[]): OperationsMember[] {
  return [...members].sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right)));
}

export function memberMatchesOperationsOrgQuery(member: OperationsMember, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystack = [
    member.name,
    member.email,
    member.status,
    member.employeeProfile?.jobTitle,
    member.manager?.name,
    member.manager?.email,
    ...(member.roles || []).map((role) => `${role.role} ${role.department?.name || ""}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function buildOperationsOrgChartTree(members: OperationsMember[]): OperationsOrgChartNode[] {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const childrenByManager = new Map<string, OperationsMember[]>();

  members.forEach((member) => {
    if (!member.managerId || !memberById.has(member.managerId)) return;

    const reports = childrenByManager.get(member.managerId) || [];
    reports.push(member);
    childrenByManager.set(member.managerId, reports);
  });

  const visited = new Set<string>();
  const buildNode = (member: OperationsMember, path = new Set<string>()): OperationsOrgChartNode => {
    if (path.has(member.id)) {
      return { member, reports: [], isCycle: true };
    }

    visited.add(member.id);
    const nextPath = new Set(path);
    nextPath.add(member.id);

    const reports = sortMembersByDisplayName(childrenByManager.get(member.id) || []).map((report) =>
      buildNode(report, nextPath),
    );

    return { member, reports };
  };

  const roots = sortMembersByDisplayName(
    members.filter((member) => !member.managerId || !memberById.has(member.managerId)),
  ).map((member) => buildNode(member));

  for (const member of sortMembersByDisplayName(members)) {
    if (!visited.has(member.id)) {
      roots.push(buildNode(member));
    }
  }

  return roots;
}

export function nodeHasOperationsOrgMatch(node: OperationsOrgChartNode, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return (
    memberMatchesOperationsOrgQuery(node.member, normalizedQuery) ||
    node.reports.some((report) => nodeHasOperationsOrgMatch(report, normalizedQuery))
  );
}

export function buildOperationsOrgChartRows(
  members: OperationsMember[],
  query = "",
): OperationsOrgChartRow[] {
  const tree = buildOperationsOrgChartTree(members);
  const rowsByDepth = new Map<number, OperationsOrgChartRowNode[]>();
  const normalizedQuery = query.trim().toLowerCase();

  function addNode(node: OperationsOrgChartNode, depth: number) {
    if (normalizedQuery && !nodeHasOperationsOrgMatch(node, normalizedQuery)) return;

    const row = rowsByDepth.get(depth) || [];
    row.push({
      member: node.member,
      reports: node.reports,
      depth,
      isCycle: Boolean(node.isCycle),
      directReportCount: node.reports.filter((report) => !report.isCycle).length,
    });
    rowsByDepth.set(depth, row);

    if (node.isCycle) return;
    node.reports.forEach((report) => addNode(report, depth + 1));
  }

  tree.forEach((node) => addNode(node, 0));

  return [...rowsByDepth.entries()]
    .sort(([leftDepth], [rightDepth]) => leftDepth - rightDepth)
    .map(([depth, nodes]) => ({ depth, nodes }));
}

export function collectOperationsDescendantIds(
  memberId: string,
  tree: OperationsOrgChartNode[],
): Set<string> {
  const descendants = new Set<string>();

  function collect(node: OperationsOrgChartNode, seen = new Set<string>()) {
    if (seen.has(node.member.id)) return;

    const nextSeen = new Set(seen);
    nextSeen.add(node.member.id);

    node.reports.forEach((report) => {
      if (report.member.id !== memberId) descendants.add(report.member.id);
      collect(report, nextSeen);
    });
  }

  function walk(node: OperationsOrgChartNode, seen = new Set<string>()): boolean {
    if (seen.has(node.member.id)) return false;
    if (node.member.id === memberId) {
      collect(node);
      return true;
    }

    const nextSeen = new Set(seen);
    nextSeen.add(node.member.id);
    return node.reports.some((report) => walk(report, nextSeen));
  }

  tree.some((node) => walk(node));
  return descendants;
}
