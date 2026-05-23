export interface DailyLogDepartmentRole {
    role: string
    departmentId?: string | null
    department?: {
        name?: string | null
    } | null
}

export type DailyLogDepartmentResult =
    | { ok: true; department: string }
    | { ok: false; status: 400 | 403; error: string }

const DAILY_LOG_DEPARTMENT_OVERRIDE_ROLES = new Set([
    'admin',
    'administrator',
    'manager',
    'operations_manager',
    'chief_operations_officer',
])

function normalizeRoleName(role: string): string {
    return role.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function cleanDepartmentName(department?: string | null): string {
    return String(department || '').trim()
}

function sameDepartment(left?: string | null, right?: string | null): boolean {
    return cleanDepartmentName(left).toLowerCase() === cleanDepartmentName(right).toLowerCase()
}

export function canOverrideDailyLogDepartment(
    roles: DailyLogDepartmentRole[],
    isPrivilegedEmail = false,
): boolean {
    if (isPrivilegedEmail) return true
    return roles.some((assignment) => DAILY_LOG_DEPARTMENT_OVERRIDE_ROLES.has(normalizeRoleName(assignment.role)))
}

export function getPrimaryDailyLogDepartment(roles: DailyLogDepartmentRole[]): string | null {
    const rolesWithDepartment = roles.filter((assignment) => cleanDepartmentName(assignment.department?.name))
    if (rolesWithDepartment.length === 0) return null

    const primary =
        rolesWithDepartment.find((assignment) => !canOverrideDailyLogDepartment([assignment])) ||
        rolesWithDepartment[0]

    return cleanDepartmentName(primary.department?.name) || null
}

export function resolveDailyLogDepartment(params: {
    requestedDepartment?: string | null
    roles: DailyLogDepartmentRole[]
    isPrivilegedEmail?: boolean
}): DailyLogDepartmentResult {
    const requestedDepartment = cleanDepartmentName(params.requestedDepartment)
    const primaryDepartment = getPrimaryDailyLogDepartment(params.roles)
    const canOverride = canOverrideDailyLogDepartment(params.roles, params.isPrivilegedEmail)

    if (canOverride) {
        const department = requestedDepartment || primaryDepartment
        if (!department) {
            return { ok: false, status: 400, error: 'Department is required.' }
        }

        return { ok: true, department }
    }

    if (!primaryDepartment) {
        return {
            ok: false,
            status: 400,
            error: 'Your account needs an assigned department before creating daily logs.',
        }
    }

    if (requestedDepartment && !sameDepartment(requestedDepartment, primaryDepartment)) {
        return { ok: false, status: 403, error: 'Daily logs use your assigned department.' }
    }

    return { ok: true, department: primaryDepartment }
}
