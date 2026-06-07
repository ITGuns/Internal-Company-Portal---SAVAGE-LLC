import express, { Request, Response, NextFunction, Router } from 'express'
import { DailyLogsService } from './daily-logs.service'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'
import { isAdminEmail } from '../config/env.config'
import { prisma } from '../database/prisma.service'
import {
    canOverrideDailyLogDepartment,
    resolveDailyLogDepartment,
    type DailyLogDepartmentRole,
} from './daily-logs.department'
import { resolvePaginationQuery } from '../http/pagination'

interface AuthRequest extends Request {
    user?: {
        userId: string
        email?: string
        [key: string]: unknown
    }
}

export class DailyLogsController {
    private service = new DailyLogsService()

    private async getUserDepartmentRoles(userId: string): Promise<DailyLogDepartmentRole[]> {
        return prisma.userRole.findMany({
            where: { userId },
            include: {
                department: {
                    select: { name: true },
                },
            },
        })
    }

    router(): Router {
        const router = express.Router()

        // Middleware to check if user owns the log or is admin
        const checkOwnership = async (req: Request, res: Response, next: NextFunction) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const found = await this.service.findById(id)

                if (!found) return res.status(404).json({ error: 'Log not found' })

                // Allow if author, privileged role, or specific authorized emails
                const roles = await this.getUserDepartmentRoles(user.userId)
                const isPrivileged = canOverrideDailyLogDepartment(roles)
                const isAuthorizedEmail = isAdminEmail(String(user.email || ''))

                if (found.authorId !== user.userId && !isPrivileged && !isAuthorizedEmail) {
                    return res.status(403).json({ error: 'Unauthorized' })
                }
                next()
            } catch (e) {
                res.status(500).json({ error: 'Ownership check failed' })
            }
        }

        // Get all logs (with optional filtering and pagination)
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const department = req.query.department as string | undefined
                const status = req.query.status as string | undefined
                const logType = req.query.logType as string | undefined
                const pagination = resolvePaginationQuery(req.query)

                const items = await this.service.findAll(department, status, logType, pagination.page, pagination.limit)
                if (Array.isArray(items)) {
                    return res.json(items)
                }
                res.json(pagination.hasExplicitPagination ? items : items.data)
            } catch (error) {
                console.error('Error fetching logs:', error)
                res.status(500).json({ error: 'Failed to fetch logs' })
            }
        })

        // Get my logs
        router.get('/my-logs', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const items = await this.service.findByAuthor(user.userId)
                res.json(items)
            } catch (error) {
                console.error('Error fetching your logs:', error)
                res.status(500).json({ error: 'Failed to fetch your logs' })
            }
        })

        // Create log
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { content, date, department, status, hoursLogged, tasks, shiftNotes, logType } = req.body
                const user = (req as AuthRequest).user

                if (!content) {
                    return res.status(400).json({ error: 'Content is required' })
                }

                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                const roles = await this.getUserDepartmentRoles(user.userId)
                const departmentResult = resolveDailyLogDepartment({
                    requestedDepartment: department,
                    roles,
                    isPrivilegedEmail: isAdminEmail(String(user.email || '')),
                })

                if (departmentResult.ok === false) {
                    return res.status(departmentResult.status).json({ error: departmentResult.error })
                }

                const item = await this.service.create({
                    content,
                    date,
                    department: departmentResult.department,
                    status,
                    hoursLogged,
                    tasks,
                    shiftNotes,
                    logType,
                    authorId: user.userId
                })

                res.status(201).json(item)
                notificationService.broadcastDataChange('daily-logs')
            } catch (error) {
                console.error('Error creating log:', error)
                res.status(500).json({ error: 'Failed to create log' })
            }
        })

        // Update log
        router.patch('/:id', authenticateToken, checkOwnership, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { content, department, status, hoursLogged, tasks, shiftNotes, logType } = req.body
                const user = (req as AuthRequest).user
                let resolvedDepartment: string | undefined

                if (department !== undefined) {
                    if (!user?.userId) {
                        return res.status(401).json({ error: 'User not authenticated' })
                    }

                    const roles = await this.getUserDepartmentRoles(user.userId)
                    const departmentResult = resolveDailyLogDepartment({
                        requestedDepartment: department,
                        roles,
                        isPrivilegedEmail: isAdminEmail(String(user.email || '')),
                    })

                    if (departmentResult.ok === false) {
                        return res.status(departmentResult.status).json({ error: departmentResult.error })
                    }

                    resolvedDepartment = departmentResult.department
                }

                const item = await this.service.update(id, {
                    content,
                    department: resolvedDepartment,
                    status,
                    hoursLogged,
                    tasks,
                    shiftNotes,
                    logType
                })

                res.json(item)
                notificationService.broadcastDataChange('daily-logs')
            } catch (error) {
                console.error('Error updating log:', error)
                res.status(500).json({ error: 'Failed to update log' })
            }
        })

        // Delete log
        router.delete('/:id', authenticateToken, checkOwnership, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                await this.service.delete(id)
                notificationService.broadcastDataChange('daily-logs')
                res.json({ message: 'Log deleted' })
            } catch (error) {
                console.error('Error deleting log:', error)
                res.status(500).json({ error: 'Failed to delete log' })
            }
        })

        // Toggle like on daily log
        router.post('/:id/like', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = (req as AuthRequest).user

                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                const result = await this.service.toggleLike(id, user.userId)
                notificationService.broadcastDataChange('daily-logs')
                res.json(result)
            } catch (error) {
                console.error('Error toggling like:', error)
                res.status(500).json({ error: 'Failed to toggle like' })
            }
        })

        return router
    }
}

