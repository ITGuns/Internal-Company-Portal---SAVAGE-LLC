import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import { hasManagementAccess } from '../org/org-access-policy'
import { isClientOnlyAccount } from '../employees/employees.security'

// Statuses the user directory treats as active (UsersService.findAll). Pending and
// inactive accounts never appear on the chart and cannot receive concerns.
export const ACTIVE_MEMBER_STATUSES = ['active', 'vacation', 'leave', 'verified']

export const ACTIVE_MEMBER_WHERE = {
  isApproved: true,
  status: { in: ACTIVE_MEMBER_STATUSES },
}

const memberSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  managerId: true,
  employeeProfile: { select: { jobTitle: true } },
  roles: {
    select: { role: true, department: { select: { name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  clientMemberships: { select: { status: true }, take: 1 },
}

export interface MemberRow {
  id: string
  email: string
  name: string | null
  avatar: string | null
  managerId: string | null
  employeeProfile?: { jobTitle: string | null } | null
  roles: Array<{ role: string; department?: { name: string } | null }>
  clientMemberships?: Array<{ status: string | null }>
}

export interface OrgChartMember {
  id: string
  name: string | null
  email: string
  avatar: string | null
  roleLabel: string
  departmentName: string | null
  managerId: string | null
  directReportCount: number
  isSupervisor: boolean
}

export interface MemberEligibility {
  member: { id: string; name: string | null; email: string }
  isSupervisor: boolean
}

/** "operations_manager" reads "Operations Manager"; labels typed by people stay as typed. */
export function formatRoleLabel(role?: string | null): string {
  const value = String(role || '').trim()
  if (!value) return 'Member'
  if (!/^[a-z0-9_]+$/.test(value)) return value

  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** A supervisor has a direct report on the chart or holds a management role. */
export function isSupervisorRow(row: Pick<MemberRow, 'email' | 'roles'>, directReportCount: number): boolean {
  return directReportCount > 0 || hasManagementAccess(row.roles, isAdminEmail(row.email))
}

export function toOrgChartMembers(rows: MemberRow[]): OrgChartMember[] {
  const internal = rows.filter((row) => !isClientOnlyAccount(row))
  const reportCounts = new Map<string, number>()
  for (const row of internal) {
    if (row.managerId) reportCounts.set(row.managerId, (reportCounts.get(row.managerId) || 0) + 1)
  }

  return internal.map((row) => {
    const directReportCount = reportCounts.get(row.id) || 0
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar,
      roleLabel: formatRoleLabel(row.employeeProfile?.jobTitle || row.roles[0]?.role),
      departmentName: row.roles.find((assignment) => assignment.department?.name)?.department?.name ?? null,
      managerId: row.managerId,
      directReportCount,
      isSupervisor: isSupervisorRow(row, directReportCount),
    }
  })
}

export class OrgChartService {
  constructor(private readonly db = prisma) {}

  /** Every active, approved internal member, with report counts taken from the same set. */
  async listMembers(): Promise<OrgChartMember[]> {
    const rows = await this.db.user.findMany({
      where: ACTIVE_MEMBER_WHERE,
      select: memberSelect,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    })
    return toOrgChartMembers(rows)
  }

  /** The member if they are active, approved and internal; null otherwise. */
  async findMemberEligibility(userId: string): Promise<MemberEligibility | null> {
    const row = await this.db.user.findFirst({
      where: { id: userId, ...ACTIVE_MEMBER_WHERE },
      select: memberSelect,
    })
    if (!row || isClientOnlyAccount(row)) return null

    const directReportCount = await this.db.user.count({
      where: { managerId: userId, ...ACTIVE_MEMBER_WHERE },
    })
    return {
      member: { id: row.id, name: row.name, email: row.email },
      isSupervisor: isSupervisorRow(row, directReportCount),
    }
  }
}
