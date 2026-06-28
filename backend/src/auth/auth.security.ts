import { canLoginApprovedUser } from './signup.requests'
import type { Prisma } from '@prisma/client'

type RoleLike = {
  role?: string | null
}

export type AuthUserLike = {
  id: string
  email: string
  name?: string | null
  avatar?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  citizenship?: string | null
  birthday?: Date | string | null
  isApproved?: boolean | null
  status?: string | null
  roles?: {
    role: string
    departmentId?: string | null
    department?: {
      name?: string | null
    } | null
  }[]
  password?: string | null
  passwordResetToken?: string | null
  passwordResetExpiry?: Date | string | null
}

export const authUserSelect = {
  id: true,
  email: true,
  name: true,
  password: true,
  isApproved: true,
  status: true,
  roles: {
    select: {
      role: true,
      departmentId: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect

export const authTokenUserSelect = {
  id: true,
  email: true,
  name: true,
  isApproved: true,
  status: true,
} satisfies Prisma.UserSelect

export const authPasswordResetUserSelect = {
  id: true,
  email: true,
  name: true,
} satisfies Prisma.UserSelect

function serializeDate(value?: Date | string | null): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : value
}

export function getAuthRoleList(user: AuthUserLike): string[] {
  return (user.roles || [])
    .map((assignment) => assignment.role)
    .filter((role): role is string => Boolean(role))
}

export function serializeAuthUser(user: AuthUserLike) {
  const roleList = getAuthRoleList(user)
  const primaryRole = roleList.includes('admin') ? 'admin' : roleList[0] || 'member'

  const deptRole = user.roles?.find((r) => r.department?.name)
  const primaryDepartment = deptRole?.department?.name || null

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatar: user.avatar ?? null,
    phone: user.phone ?? null,
    address: user.address ?? null,
    city: user.city ?? null,
    citizenship: user.citizenship ?? null,
    birthday: serializeDate(user.birthday) ?? null,
    isApproved: user.isApproved ?? false,
    status: user.status ?? null,
    role: primaryRole,
    roles: roleList,
    department: primaryDepartment,
  }
}

export function canIssueAuthTokens(user: { isApproved?: boolean | null; status?: string | null }): boolean {
  return canLoginApprovedUser(user)
}
