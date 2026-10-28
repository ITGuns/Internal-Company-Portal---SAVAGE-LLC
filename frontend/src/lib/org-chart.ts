import { apiFetch } from './api';

// Shapes of GET /api/org-chart (backend/src/org-chart). Tree helpers are pure so
// node --test can load this file with a stubbed './api'.

export interface OrgChartMember {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  roleLabel: string;
  departmentName: string | null;
  managerId: string | null;
  directReportCount: number;
  isSupervisor: boolean;
}

export interface OrgChartViewer {
  id: string;
  canEditReportingLines: boolean;
  canSetRoot: boolean;
  isFullAccess: boolean;
}

export interface OrgChartData {
  viewer: OrgChartViewer;
  members: OrgChartMember[];
}

export interface OrgChartNode {
  member: OrgChartMember;
  reports: OrgChartNode[];
}

export interface OrgChartDepartmentGroup {
  name: string;
  roots: OrgChartNode[];
  size: number;
}

export const ORG_CHART_QUERY_KEY = ['org-chart'] as const;
export const NO_DEPARTMENT_LABEL = 'No department';

type NamedMember = Pick<OrgChartMember, 'name' | 'email'>;

export function getMemberDisplayName(member: NamedMember): string {
  return member.name?.trim() || member.email;
}

export function getMemberInitials(member: NamedMember): string {
  const words = getMemberDisplayName(member).split(/[\s@._-]+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
  return initials || '?';
}

function compareMembers(left: NamedMember, right: NamedMember): number {
  return getMemberDisplayName(left).localeCompare(getMemberDisplayName(right));
}

function hasManagerOnChart(member: OrgChartMember, byId: Map<string, OrgChartMember>): boolean {
  return Boolean(member.managerId && member.managerId !== member.id && byId.has(member.managerId));
}

/**
 * Reporting tree. Roots are members without a manager on the chart (no manager,
 * or one who is inactive). A loop in the data (A reports to B, B to A) cannot
 * hang the page: each member is placed once and the first one of a loop becomes a root.
 */
export function buildOrgChartTree(members: OrgChartMember[]): OrgChartNode[] {
  const byId = new Map(members.map((member) => [member.id, member]));
  const reportsByManager = new Map<string, OrgChartMember[]>();
  for (const member of members) {
    if (!hasManagerOnChart(member, byId)) continue;
    reportsByManager.set(member.managerId!, [...(reportsByManager.get(member.managerId!) || []), member]);
  }

  const placed = new Set<string>();
  const build = (member: OrgChartMember): OrgChartNode => {
    placed.add(member.id);
    const reports: OrgChartNode[] = [];
    for (const report of [...(reportsByManager.get(member.id) || [])].sort(compareMembers)) {
      if (!placed.has(report.id)) reports.push(build(report));
    }
    return { member, reports };
  };

  const sorted = [...members].sort(compareMembers);
  const roots = sorted.filter((member) => !hasManagerOnChart(member, byId)).map(build);
  for (const member of sorted) {
    if (!placed.has(member.id)) roots.push(build(member));
  }
  return roots;
}

export function countOrgChartNodes(node: OrgChartNode): number {
  return node.reports.reduce((total, report) => total + countOrgChartNodes(report), 1);
}

/**
 * Roots grouped under their department heading. `departmentOrder` puts known
 * departments first in that order; the rest follow by name, "No department" last.
 */
export function groupOrgChartByDepartment(
  roots: OrgChartNode[],
  departmentOrder: readonly string[] = [],
): OrgChartDepartmentGroup[] {
  const groups = roots.reduce((map, root) => {
    const name = root.member.departmentName || NO_DEPARTMENT_LABEL;
    const group = map.get(name) || { name, roots: [], size: 0 };
    return new Map(map).set(name, {
      ...group,
      roots: [...group.roots, root],
      size: group.size + countOrgChartNodes(root),
    });
  }, new Map<string, OrgChartDepartmentGroup>());

  const rank = (name: string) => {
    if (name === NO_DEPARTMENT_LABEL) return Number.MAX_SAFE_INTEGER;
    const index = departmentOrder.indexOf(name);
    return index === -1 ? departmentOrder.length : index;
  };
  return [...groups.values()].sort((left, right) => rank(left.name) - rank(right.name) || left.name.localeCompare(right.name));
}

export function memberMatchesQuery(member: OrgChartMember, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return [member.name, member.email, member.roleLabel, member.departmentName]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function findMatchingMemberIds(members: OrgChartMember[], query: string): Set<string> {
  return new Set(members.filter((member) => memberMatchesQuery(member, query)).map((member) => member.id));
}

/** Every manager above the given members, so their branches can be expanded. */
export function collectAncestorIds(memberIds: Iterable<string>, members: OrgChartMember[]): Set<string> {
  const byId = new Map(members.map((member) => [member.id, member]));
  const ancestors = new Set<string>();
  for (const id of memberIds) {
    const seen = new Set<string>([id]);
    let managerId = byId.get(id)?.managerId ?? null;
    while (managerId && byId.has(managerId) && !seen.has(managerId)) {
      seen.add(managerId);
      ancestors.add(managerId);
      managerId = byId.get(managerId)?.managerId ?? null;
    }
  }
  return ancestors;
}

/** Everyone below a member (direct and indirect reports). Loop-safe. */
export function collectDescendantIds(memberId: string, members: OrgChartMember[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [memberId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const member of members) {
      if (member.managerId === current && member.id !== memberId && !descendants.has(member.id)) {
        descendants.add(member.id);
        queue.push(member.id);
      }
    }
  }
  return descendants;
}

/** Who can become this member's manager: anyone active except themselves and their own reports. */
export function getManagerCandidates(memberId: string, members: OrgChartMember[]): OrgChartMember[] {
  const blocked = collectDescendantIds(memberId, members).add(memberId);
  return members.filter((member) => !blocked.has(member.id)).sort(compareMembers);
}

/** Contact shows on supervisors, never on your own card. */
export function canContactMember(member: OrgChartMember, viewerId: string): boolean {
  return member.isSupervisor && member.id !== viewerId;
}

/** People a concern can go to: supervisors, or any member for a full-access viewer. Never yourself. */
export function getConcernRecipients(
  members: OrgChartMember[],
  viewer: Pick<OrgChartViewer, 'id' | 'isFullAccess'>,
  excludeIds: readonly string[] = [],
  allowAnyMember = viewer.isFullAccess,
): OrgChartMember[] {
  return members
    .filter((member) => member.id !== viewer.id && !excludeIds.includes(member.id))
    .filter((member) => allowAnyMember || member.isSupervisor)
    .sort(compareMembers);
}

export async function fetchOrgChart(): Promise<OrgChartData> {
  const response = await apiFetch('/org-chart');
  return response.json();
}

/** PATCH /api/users/:id { managerId }; null makes the member a root. The route checks rights and cycles. */
export async function updateMemberManager(memberId: string, managerId: string | null): Promise<void> {
  await apiFetch(`/users/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ managerId }),
  });
}
