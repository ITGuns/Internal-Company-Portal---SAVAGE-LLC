import express, { Request, Response, Router } from 'express'
import { UsersService } from './users.service'
import { authenticateToken, requireRole, AuthRequest } from '../auth/auth.middleware'
import { emailService } from '../email/email.service'
import { PayrollService } from '../payroll/payroll.service'
import { DepartmentsService } from '../departments/departments.service'
import { isAdminEmail } from '../config/env.config'
import { canRequestAssigneeTasks, hasTaskAssignmentPrivilege } from '../tasks/tasks.permissions'
import { validateAvatarValue } from '../uploads/upload.validation'
import { sanitizeUserForDirectory, sanitizeUsersForDirectory } from './users.security'
import { UserOnboardingConflictError, UserOnboardingValidationError } from './users.service'
import { hasEmployeeManagementAccess } from '../employees/employees.security'
import { hasFullAccess, normalizeOrgRoleName, type OrgRoleLike } from '../org/org-access-policy'
import { resolvePaginationQuery } from '../http/pagination'
import { createLogger } from '../observability/logger'

const logger = createLogger('users.users.controller')


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CLIENT_DIRECTORY_ONLY_ROLES = new Set([
    'client',
    'client_owner',
    'client_member',
    'client_viewer',
])

function hasInternalDirectoryAccess(
    roles: OrgRoleLike[] = [],
    isConfiguredAdminEmail = false,
): boolean {
    if (hasFullAccess(roles, isConfiguredAdminEmail)) return true

    return roles.some((assignment) => {
        const normalizedRole = normalizeOrgRoleName(assignment.role)
        return Boolean(normalizedRole && !CLIENT_DIRECTORY_ONLY_ROLES.has(normalizedRole))
    })
}

export class UsersController {
    private service = new UsersService()
    private payrollService = new PayrollService()
    private departmentsService = new DepartmentsService()

    private async resolveDirectoryAccess(req: Request): Promise<{
        requesterId: string
        canReadInternalDirectory: boolean
    } | null> {
        const authReq = req as AuthRequest
        const requesterId = authReq.user?.userId

        if (!requesterId) return null

        const requesterRoles = await this.service.getUserRoles(requesterId)

        return {
            requesterId,
            canReadInternalDirectory: hasInternalDirectoryAccess(
                requesterRoles,
                isAdminEmail(authReq.user?.email),
            ),
        }
    }

    private denyInternalDirectoryAccess(res: Response) {
        return res.status(403).json({ error: 'User directory access is restricted to internal accounts' })
    }

    router(): Router {
        const router = express.Router()

        // Get all users (with optional pagination)
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.resolveDirectoryAccess(req)
                if (!access) {
                    return res.status(401).json({ error: 'Authentication required' })
                }
                if (!access.canReadInternalDirectory) {
                    return this.denyInternalDirectoryAccess(res)
                }

                const pagination = resolvePaginationQuery(req.query)
                const users = await this.service.findAll(pagination.page, pagination.limit)

                if (Array.isArray(users)) {
                    return res.json(sanitizeUsersForDirectory(users))
                }

                if (!pagination.hasExplicitPagination) {
                    return res.json(sanitizeUsersForDirectory(users.data))
                }

                res.json({
                    ...users,
                    data: sanitizeUsersForDirectory(users.data),
                })
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch users' })
            }
        })

        // Search users
        router.get('/search', authenticateToken, async (req: Request, res: Response) => {
            try {
                const access = await this.resolveDirectoryAccess(req)
                if (!access) {
                    return res.status(401).json({ error: 'Authentication required' })
                }
                if (!access.canReadInternalDirectory) {
                    return this.denyInternalDirectoryAccess(res)
                }

                const query = req.query.q as string
                if (!query) {
                    return res.status(400).json({ error: 'Search query required' })
                }
                const users = await this.service.search(query)
                res.json(sanitizeUsersForDirectory(users))
            } catch (error) {
                res.status(500).json({ error: 'Failed to search users' })
            }
        })

        // Get user by ID
        router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const access = await this.resolveDirectoryAccess(req)

                if (!access) {
                    return res.status(401).json({ error: 'Authentication required' })
                }
                if (access.requesterId !== id && !access.canReadInternalDirectory) {
                    return this.denyInternalDirectoryAccess(res)
                }

                const user = await this.service.findById(id)

                if (!user) {
                    return res.status(404).json({ error: 'User not found' })
                }

                res.json(sanitizeUserForDirectory(user))
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user' })
            }
        })

        // Upload / update user avatar
        router.post('/:id/avatar', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId

                // Check authorization: must be self or admin
                if (requesterId !== id) {
                    const userRoles = await this.service.getUserRoles(requesterId!)
                    const isAdmin = hasFullAccess(userRoles)
                    if (!isAdmin) {
                        return res.status(403).json({ error: 'Unauthorized to update another user\'s avatar' })
                    }
                }

                // Accept base64 data URI or a URL string
                const { avatar } = req.body
                if (!avatar || typeof avatar !== 'string') {
                    return res.status(400).json({ error: 'Avatar data is required' })
                }

                const avatarValidation = validateAvatarValue(avatar)
                if (!avatarValidation.valid) {
                    return res.status(400).json({ error: avatarValidation.error || 'Invalid avatar data' })
                }

                const user = await this.service.update(id, { avatar: avatarValidation.value })

                res.json({ success: true, user: sanitizeUserForDirectory(user) })
            } catch (error) {
                logger.error('Avatar upload error:', error)
                res.status(500).json({ error: 'Failed to update avatar' })
            }
        })

        // Get user's roles
        router.get('/:id/roles', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const access = await this.resolveDirectoryAccess(req)

                if (!access) {
                    return res.status(401).json({ error: 'Authentication required' })
                }
                if (access.requesterId !== id && !access.canReadInternalDirectory) {
                    return this.denyInternalDirectoryAccess(res)
                }

                const roles = await this.service.getUserRoles(id)
                res.json(roles)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user roles' })
            }
        })

        // Get user's tasks
        router.get('/:id/tasks', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) {
                    return res.status(401).json({ error: 'Authentication required' })
                }

                const roles = await this.service.getUserRoles(requesterId)
                const access = {
                    requesterId,
                    isPrivileged: hasTaskAssignmentPrivilege(roles) || isAdminEmail(authReq.user?.email),
                }

                if (!canRequestAssigneeTasks(access, id)) {
                    return res.status(403).json({ error: 'You can only view tasks assigned to you' })
                }

                const tasks = await this.service.getUserTasks(id)
                res.json(tasks)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user tasks' })
            }
        })

        // Generate approved-user onboarding setup link (Admin only)
        router.post('/onboarding-invitations', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
            try {
                const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
                const roleId = typeof req.body.roleId === 'string' ? req.body.roleId.trim() : ''

                if (!email) {
                    return res.status(400).json({ error: 'Email is required' })
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return res.status(400).json({ error: 'Invalid email format' })
                }
                if (!roleId) {
                    return res.status(400).json({ error: 'Role is required' })
                }

                const invitation = await this.service.createOnboardingInvitation({ email, roleId })
                res.status(201).json({
                    user: sanitizeUserForDirectory(invitation.user),
                    onboarding: invitation.onboarding,
                })
            } catch (error) {
                if (error instanceof UserOnboardingValidationError) {
                    return res.status(400).json({ error: error.message })
                }
                if (error instanceof UserOnboardingConflictError) {
                    return res.status(409).json({ error: error.message })
                }

                logger.error('User onboarding invitation error:', error)
                res.status(500).json({ error: 'Failed to create onboarding link' })
            }
        })

        // Create user (Admin only)
        router.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
            try {
                const { email, name, avatar } = req.body

                if (!email) {
                    return res.status(400).json({ error: 'Email is required' })
                }

                const avatarValidation = avatar === undefined ? undefined : validateAvatarValue(avatar)
                if (avatarValidation && !avatarValidation.valid) {
                    return res.status(400).json({ error: avatarValidation.error || 'Invalid avatar data' })
                }

                // Check if user already exists
                const existingUser = await this.service.findByEmail(email)
                if (existingUser) {
                    return res.status(409).json({ error: 'User with this email already exists' })
                }

                const user = await this.service.create({ email, name, avatar: avatarValidation?.value })

                // Send welcome email (async, don't block response)
                const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
                emailService.sendWelcomeEmail(
                    user.email,
                    user.name || 'New User',
                    `${loginUrl}/login`
                ).catch(err => {
                    logger.error('Failed to send welcome email:', err)
                    // Don't fail user creation if email fails
                })

                res.status(201).json(sanitizeUserForDirectory(user))
            } catch (error) {
                res.status(500).json({ error: 'Failed to create user' })
            }
        })

        // Update user (Self or Admin/Operations Manager)
        router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const {
                    name,
                    email,
                    avatar,
                    birthday,
                    phone,
                    address,
                    city,
                    citizenship,
                    status,
                    appliedDate,
                    salary,
                    role,
                    department,
                    managerId,
                    payrollScheme,
                    maxBillableHoursPerDay,
                } = req.body
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId
                if (!requesterId) {
                    return res.status(401).json({ error: 'Authentication required' })
                }

                const requesterRoles = await this.service.getUserRoles(requesterId)
                const isPrivileged = hasEmployeeManagementAccess(
                    requesterRoles,
                    isAdminEmail(authReq.user?.email),
                )
                const canManageIdentity = hasFullAccess(
                    requesterRoles,
                    isAdminEmail(authReq.user?.email),
                )

                if (requesterId !== id && !isPrivileged) {
                    return res.status(403).json({ error: 'Unauthorized to update another user' })
                }

                const protectedFields = [
                    'status',
                    'appliedDate',
                    'salary',
                    'role',
                    'department',
                    'departmentId',
                    'isApproved',
                    'managerId',
                    'payrollScheme',
                    'maxBillableHoursPerDay',
                ]
                const requestedProtectedFields = protectedFields.filter(field =>
                    Object.prototype.hasOwnProperty.call(req.body, field)
                )

                if (requestedProtectedFields.length > 0 && !isPrivileged) {
                    return res.status(403).json({
                        error: 'Only authorized managers can update employee status, payroll, role, or department fields',
                    })
                }

                let normalizedManagerId: string | null | undefined
                if (managerId !== undefined) {
                    if (!isPrivileged) {
                        return res.status(403).json({ error: 'Only authorized managers can update reporting lines' })
                    }
                    if (managerId !== null && typeof managerId !== 'string') {
                        return res.status(400).json({ error: 'Manager ID must be a string or null' })
                    }

                    normalizedManagerId = typeof managerId === 'string' && managerId.trim()
                        ? managerId.trim()
                        : null

                    if (normalizedManagerId === id) {
                        return res.status(400).json({ error: 'A member cannot report to themselves' })
                    }

                    if (normalizedManagerId) {
                        const manager = await this.service.findById(normalizedManagerId)
                        if (!manager) {
                            return res.status(400).json({ error: 'Manager not found' })
                        }
                        if (await this.service.wouldCreateManagerCycle(id, normalizedManagerId)) {
                            return res.status(400).json({ error: 'Reporting line would create a cycle' })
                        }
                    }
                }

                const avatarValidation = avatar === undefined ? undefined : validateAvatarValue(avatar)
                if (avatarValidation && !avatarValidation.valid) {
                    return res.status(400).json({ error: avatarValidation.error || 'Invalid avatar data' })
                }

                // Check if user exists
                const existingUser = await this.service.findById(id)
                if (!existingUser) {
                    return res.status(404).json({ error: 'User not found' })
                }

                let normalizedEmail: string | undefined
                if (email !== undefined) {
                    if (typeof email !== 'string') {
                        return res.status(400).json({ error: 'Email must be a string' })
                    }

                    normalizedEmail = email.trim().toLowerCase()
                    if (!EMAIL_REGEX.test(normalizedEmail)) {
                        return res.status(400).json({ error: 'Invalid email format' })
                    }

                    const isEmailChange = normalizedEmail !== existingUser.email.toLowerCase()
                    if (isEmailChange && !canManageIdentity) {
                        return res.status(403).json({
                            error: 'Only full-access administrators can change account email addresses',
                        })
                    }
                }

                // Update basic user info
                const user = await this.service.update(id, {
                    name,
                    email: normalizedEmail,
                    avatar: avatarValidation?.value,
                    birthday,
                    phone,
                    address,
                    city,
                    citizenship,
                    status,
                    appliedDate,
                    isApproved: status !== undefined ? status !== 'pending' : undefined,
                    managerId: normalizedManagerId,
                })

                // Handle Salary / Payroll Update
                if (salary !== undefined || payrollScheme !== undefined || maxBillableHoursPerDay !== undefined) {
                    await this.payrollService.getEmployeeProfile(id) // Ensure profile exists
                    await this.payrollService.updateEmployeeProfile(id, {
                        ...(salary !== undefined ? { baseSalary: salary, currency: 'PHP' } : {}),
                        ...(payrollScheme !== undefined ? { payrollScheme } : {}),
                        ...(maxBillableHoursPerDay !== undefined ? { maxBillableHoursPerDay } : {}),
                    })
                }

                // Handle Role / Department Update
                if (role !== undefined || department !== undefined || req.body.departmentId !== undefined) {
                    let departmentIdToAssign = req.body.departmentId || undefined

                    // If department name provided instead of ID, look up ID
                    if (department && !departmentIdToAssign) {
                        const dept = await this.departmentsService.findByName(department)
                        if (dept) departmentIdToAssign = dept.id
                    }

                    // For now, we update the primary role (simplified logic: remove old roles and add new one)
                    const currentRoles = await this.service.getUserRoles(id)
                    for (const r of currentRoles) {
                        await this.service.removeRole(id, r.role, r.departmentId || undefined)
                    }

                    const newRole = role || (currentRoles[0]?.role || 'employee')
                    await this.service.assignRole(id, newRole, departmentIdToAssign)
                }

                res.json({ success: true, user: sanitizeUserForDirectory(user) })
            } catch (error) {
                logger.error('Update user error:', error)
                res.status(500).json({ error: 'Failed to update user' })
            }
        })

        // Delete user (Admin or Operations Manager)
        router.delete('/:id', authenticateToken, requireRole(['admin', 'operations_manager']), async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                // Check if user exists
                const existingUser = await this.service.findById(id)
                if (!existingUser) {
                    return res.status(404).json({ error: 'User not found' })
                }

                await this.service.delete(id)
                res.json({ message: 'User deleted successfully' })
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete user' })
            }
        })

        // Assign role to user
        router.post('/:id/roles', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { role, departmentId } = req.body

                if (!role) {
                    return res.status(400).json({ error: 'Role is required' })
                }

                await this.service.assignRole(id, role, departmentId)
                res.status(201).json({ message: 'Role assigned successfully' })
            } catch (error) {
                res.status(500).json({ error: 'Failed to assign role' })
            }
        })

        // Remove role from user
        router.delete('/:id/roles/:role', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const role = Array.isArray(req.params.role) ? req.params.role[0] : req.params.role
                const departmentId = req.query.departmentId as string

                await this.service.removeRole(id, role, departmentId)
                res.json({ message: 'Role removed successfully' })
            } catch (error) {
                res.status(500).json({ error: 'Failed to remove role' })
            }
        })

        return router
    }
}
