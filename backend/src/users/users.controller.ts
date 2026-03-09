import express, { Request, Response, Router } from 'express'
import { UsersService } from './users.service'
import { authenticateToken, requireRole, AuthRequest } from '../auth/auth.middleware'
import { emailService } from '../email/email.service'
import { PayrollService } from '../payroll/payroll.service'
import { DepartmentsService } from '../departments/departments.service'

export class UsersController {
    private service = new UsersService()
    private payrollService = new PayrollService()
    private departmentsService = new DepartmentsService()

    router(): Router {
        const router = express.Router()

        // Get all users
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const users = await this.service.findAll()
                res.json(users)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch users' })
            }
        })

        // Search users
        router.get('/search', authenticateToken, async (req: Request, res: Response) => {
            try {
                const query = req.query.q as string
                if (!query) {
                    return res.status(400).json({ error: 'Search query required' })
                }
                const users = await this.service.search(query)
                res.json(users)
            } catch (error) {
                res.status(500).json({ error: 'Failed to search users' })
            }
        })

        // Get user by ID
        router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = await this.service.findById(id)

                if (!user) {
                    return res.status(404).json({ error: 'User not found' })
                }

                res.json(user)
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
                    const isAdmin = userRoles.some(r => r.role === 'overlord')
                    if (!isAdmin) {
                        return res.status(403).json({ error: 'Unauthorized to update another user\'s avatar' })
                    }
                }

                // Accept base64 data URI or a URL string
                const { avatar } = req.body
                if (!avatar) {
                    return res.status(400).json({ error: 'Avatar data is required' })
                }

                // Validate size if base64 (rough check: base64 length * 0.75 = bytes)
                if (avatar.startsWith('data:image/')) {
                    const base64Data = avatar.split(',')[1] || ''
                    const sizeBytes = Math.round((base64Data.length * 3) / 4)
                    if (sizeBytes > 5 * 1024 * 1024) {
                        return res.status(400).json({ error: 'Avatar image must be less than 5MB' })
                    }
                }

                const user = await this.service.update(id, { avatar })

                res.json({ success: true, user })
            } catch (error) {
                console.error('Avatar upload error:', error)
                res.status(500).json({ error: 'Failed to update avatar' })
            }
        })

        // Get user's roles
        router.get('/:id/roles', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
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
                const tasks = await this.service.getUserTasks(id)
                res.json(tasks)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user tasks' })
            }
        })

        // Create user (Overlord only)
        router.post('/', authenticateToken, requireRole('overlord'), async (req: Request, res: Response) => {
            try {
                const { email, name, avatar } = req.body

                if (!email) {
                    return res.status(400).json({ error: 'Email is required' })
                }

                // Check if user already exists
                const existingUser = await this.service.findByEmail(email)
                if (existingUser) {
                    return res.status(409).json({ error: 'User with this email already exists' })
                }

                const user = await this.service.create({ email, name, avatar })

                // Send welcome email (async, don't block response)
                const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
                emailService.sendWelcomeEmail(
                    user.email,
                    user.name || 'New User',
                    `${loginUrl}/login`
                ).catch(err => {
                    console.error('Failed to send welcome email:', err)
                    // Don't fail user creation if email fails
                })

                res.status(201).json(user)
            } catch (error) {
                res.status(500).json({ error: 'Failed to create user' })
            }
        })

        // Update user (Self or Admin/Operations Manager)
        router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { name, email, avatar, birthday, phone, address, city, citizenship, status, appliedDate, salary, role, department } = req.body
                const authReq = req as AuthRequest
                const requesterId = authReq.user?.userId

                // Check authorization
                if (requesterId !== id) {
                    // Check if requester is admin or operations_manager
                    const userRoles = await this.service.getUserRoles(requesterId!)
                    const isPrivileged = userRoles.some(r =>
                        r.role === 'overlord' ||
                        r.role === 'operations_manager' ||
                        r.role === 'Operations Manager' ||
                        r.role === 'Chief Operations Officer'
                    )
                    const isAuthorizedEmail = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com']
                        .includes(authReq.user?.email?.toLowerCase() || '')

                    if (!isPrivileged && !isAuthorizedEmail) {
                        return res.status(403).json({ error: 'Unauthorized to update another user' })
                    }
                }

                // Check if user exists
                const existingUser = await this.service.findById(id)
                if (!existingUser) {
                    return res.status(404).json({ error: 'User not found' })
                }

                // Update basic user info
                const user = await this.service.update(id, {
                    name,
                    email,
                    avatar,
                    birthday,
                    phone,
                    address,
                    city,
                    citizenship,
                    status,
                    appliedDate
                })

                // Handle Salary / Payroll Update
                if (salary !== undefined) {
                    await this.payrollService.getEmployeeProfile(id) // Ensure profile exists
                    await this.payrollService.updateEmployeeProfile(id, {
                        baseSalary: salary,
                        currency: 'PHP' // Default to PHP as requested
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

                res.json({ success: true, user })
            } catch (error) {
                console.error('Update user error:', error)
                res.status(500).json({ error: 'Failed to update user' })
            }
        })

        // Delete user (Overlord or Operations Manager)
        router.delete('/:id', authenticateToken, requireRole(['overlord', 'operations_manager']), async (req: Request, res: Response) => {
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
        router.post('/:id/roles', authenticateToken, requireRole('overlord'), async (req: Request, res: Response) => {
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
        router.delete('/:id/roles/:role', authenticateToken, requireRole('overlord'), async (req: Request, res: Response) => {
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
