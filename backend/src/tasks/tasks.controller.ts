import express, { Request, Response, Router } from 'express'
import { TasksService, TaskStatus } from './tasks.service'
import { authenticateToken, requireRole, AuthRequest } from '../auth/auth.middleware'
import { emailService } from '../email/email.service'
import { notificationService } from '../notifications/socket.service'
import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import {
  canReadTask,
  canRequestAssigneeTasks,
  getPrimaryTaskAssignment,
  getTaskVisibilityFilter,
  hasTaskAssignmentPrivilege,
  type PrimaryTaskAssignment,
} from './tasks.permissions'

interface TaskAccessContext {
  requesterId: string
  isPrivileged: boolean
  primaryAssignment: PrimaryTaskAssignment | null
}

export class TasksController {
  private service = new TasksService()

  private async getAccessContext(req: Request): Promise<TaskAccessContext | null> {
    const authReq = req as AuthRequest
    const requesterId = authReq.user?.userId
    if (!requesterId) return null

    const roles = await prisma.userRole.findMany({
      where: { userId: requesterId },
      include: { department: true },
    })

    return {
      requesterId,
      isPrivileged: hasTaskAssignmentPrivilege(roles) || isAdminEmail(authReq.user?.email),
      primaryAssignment: getPrimaryTaskAssignment(roles),
    }
  }

  router(): Router {
    const router = express.Router()

    // Get all tasks (with optional pagination)
    router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const tasks = await this.service.findAll(page, limit, getTaskVisibilityFilter(access))
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' })
      }
    })

    // Search tasks
    router.get('/search', authenticateToken, async (req: Request, res: Response) => {
      try {
        const query = req.query.q as string
        if (!query) {
          return res.status(400).json({ error: 'Search query required' })
        }
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const tasks = await this.service.search(query, getTaskVisibilityFilter(access))
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to search tasks' })
      }
    })

    // Get tasks by status
    router.get('/status/:status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const status = Array.isArray(req.params.status)
          ? req.params.status[0]
          : req.params.status

        // Validate status
        const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed']
        if (!validStatuses.includes(status as TaskStatus)) {
          return res.status(400).json({
            error: 'Invalid status',
            validStatuses
          })
        }

        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const tasks = await this.service.findByStatus(status as TaskStatus, getTaskVisibilityFilter(access))
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks by status' })
      }
    })

    // Get tasks by department
    router.get('/department/:departmentId', authenticateToken, async (req: Request, res: Response) => {
      try {
        const departmentId = Array.isArray(req.params.departmentId)
          ? req.params.departmentId[0]
          : req.params.departmentId

        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const tasks = await this.service.findByDepartment(departmentId, getTaskVisibilityFilter(access))
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks by department' })
      }
    })

    // Get tasks by assignee
    router.get('/assignee/:assigneeId', authenticateToken, async (req: Request, res: Response) => {
      try {
        const assigneeId = Array.isArray(req.params.assigneeId)
          ? req.params.assigneeId[0]
          : req.params.assigneeId

        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        if (!canRequestAssigneeTasks(access, assigneeId)) {
          return res.status(403).json({ error: 'You can only view tasks assigned to you' })
        }

        const tasks = await this.service.findByAssignee(assigneeId)
        res.json(tasks)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks by assignee' })
      }
    })

    // Get task by ID
    router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const task = await this.service.findById(id)

        if (!task) {
          return res.status(404).json({ error: 'Task not found' })
        }

        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        if (!canReadTask(access, task)) {
          return res.status(403).json({ error: 'You can only view tasks assigned to you' })
        }

        res.json(task)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task' })
      }
    })

    // Create task
    router.post('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const { title, description, status, departmentId, assigneeId, assigneeIds, priority, startDate, dueDate, notes, estimatedTime, role } = req.body
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        if (!title) {
          return res.status(400).json({ error: 'Title is required' })
        }

        let effectiveDepartmentId = departmentId
        let effectiveAssigneeId = assigneeId
        let effectiveRole = role

        if (!access.isPrivileged) {
          if (!access.primaryAssignment) {
            return res.status(400).json({
              error: 'Your account needs an assigned role and department before creating tasks',
            })
          }

          effectiveDepartmentId = access.primaryAssignment.departmentId
          effectiveAssigneeId = access.requesterId
          effectiveRole = access.primaryAssignment.role
        }

        if (!effectiveDepartmentId) {
          return res.status(400).json({ error: 'Department ID is required' })
        }

        const task = await this.service.create({
          title,
          description,
          status,
          departmentId: effectiveDepartmentId,
          assigneeId: effectiveAssigneeId,
          assigneeIds,
          createdById: access.requesterId,
          priority,
          startDate,
          dueDate,
          role: effectiveRole,
          notes,
          estimatedTime
        })

        // Send task assigned email & notification if there's an assignee
        if (task.assignee && task.department) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
          const taskUrl = `${frontendUrl}/task-tracking?task=${task.id}`

          // 1. Send Email
          emailService.sendTaskAssignedEmail(
            task.assignee.email,
            {
              userName: task.assignee.name || 'Team Member',
              taskTitle: task.title,
              taskDescription: task.description || 'No description provided',
              assignedBy: (req as any).user?.name || (req as any).user?.email || 'Admin',
              taskUrl,
              departmentName: task.department.name
            }
          ).catch(err => console.error('Failed to send task assignment email:', err))

          // 2. Send Real-time Notification
          notificationService.notifyUser(task.assignee.id, {
            type: 'info',
            title: 'New Task Assigned',
            message: `You have been assigned to: ${task.title}`,
            link: `/task-tracking?task=${task.id}`
          })
        }

        // Send email & notification to all multiple assignees as well
        if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0 && task.department) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
          const taskUrl = `${frontendUrl}/task-tracking?task=${task.id}`
          const users = await prisma.user.findMany({
            where: { id: { in: assigneeIds } }
          })
          for (const u of users) {
            if (u.id === task.assigneeId) continue;
            emailService.sendTaskAssignedEmail(
              u.email,
              {
                userName: u.name || 'Team Member',
                taskTitle: task.title,
                taskDescription: task.description || 'No description provided',
                assignedBy: (req as any).user?.name || (req as any).user?.email || 'Admin',
                taskUrl,
                departmentName: task.department?.name || 'Department'
              }
            ).catch(err => console.error('Failed to send task assignment email:', err))

            notificationService.notifyUser(u.id, {
              type: 'info',
              title: 'New Task Assigned (Multi-assignee)',
              message: `You have been assigned to: ${task.title}`,
              link: `/task-tracking?task=${task.id}`
            })
          }
        }

        notificationService.broadcastDataChange('tasks')
        res.status(201).json(task)
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({
            error: 'Invalid department or assignee ID'
          })
        }
        res.status(500).json({ error: 'Failed to create task' })
      }
    })

    // Update task
    router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const { title, description, status, departmentId, assigneeId, assigneeIds, priority, startDate, dueDate, notes, progress, timerStatus, timerStart, totalElapsed, estimatedTime, role } = req.body
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        // Check if task exists
        const existingTask = await this.service.findById(id)
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' })
        }

        if (!access.isPrivileged) {
          if (existingTask.assigneeId !== access.requesterId) {
            return res.status(403).json({ error: 'You can only update tasks assigned to you' })
          }

          const protectedFields = ['assigneeId', 'assigneeIds', 'departmentId', 'role']
          const requestedProtectedFields = protectedFields.filter((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field),
          )

          if (requestedProtectedFields.length > 0) {
            return res.status(403).json({
              error: 'Only managers and admins can change task assignment, department, or role',
            })
          }
        }

        const task = await this.service.update(id, {
          title,
          description,
          status,
          departmentId: access.isPrivileged ? departmentId : undefined,
          assigneeId: access.isPrivileged ? assigneeId : undefined,
          assigneeIds: access.isPrivileged ? assigneeIds : undefined,
          priority,
          startDate,
          dueDate,
          role: access.isPrivileged ? role : undefined,
          notes,
          progress,
          timerStatus,
          timerStart,
          totalElapsed,
          estimatedTime
        }, {
          actorId: access.requesterId,
        })

        // Send status changed email & notification if status was updated
        if (status && existingTask.status !== status && task.assignee) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
          const taskUrl = `${frontendUrl}/task-tracking?task=${task.id}`

          // 1. Send Email
          emailService.sendTaskStatusChangedEmail(
            task.assignee.email,
            {
              userName: task.assignee.name || 'Team Member',
              taskTitle: task.title,
              oldStatus: existingTask.status,
              newStatus: status,
              changedBy: (req as any).user?.name || (req as any).user?.email || 'Admin',
              taskUrl
            }
          ).catch(err => console.error('Failed to send status change email:', err))

          // 2. Send Real-time Notification
          notificationService.notifyUser(task.assignee.id, {
            type: 'info',
            title: 'Task Updated',
            message: `Task "${task.title}" moved to ${status}`,
            link: `/task-tracking?task=${task.id}`
          })
        }

        if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0 && task.department) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
          const taskUrl = `${frontendUrl}/task-tracking?task=${task.id}`
          const previousAssigneeIds = Array.isArray((existingTask as any).assigneeIds) ? ((existingTask as any).assigneeIds as string[]) : []
          const newlyAddedIds = assigneeIds.filter((id: string) => !previousAssigneeIds.includes(id))
          if (newlyAddedIds.length > 0) {
            const users = await prisma.user.findMany({
              where: { id: { in: newlyAddedIds } }
            })
            for (const u of users) {
              if (u.id === task.assigneeId) continue
              emailService.sendTaskAssignedEmail(
                u.email,
                {
                  userName: u.name || 'Team Member',
                  taskTitle: task.title,
                  taskDescription: task.description || 'No description provided',
                  assignedBy: (req as any).user?.name || (req as any).user?.email || 'Admin',
                  taskUrl,
                  departmentName: task.department?.name || 'Department'
                }
              ).catch(err => console.error('Failed to send task assignment email:', err))

              notificationService.notifyUser(u.id, {
                type: 'info',
                title: 'New Task Assigned (Multi-assignee)',
                message: `You have been assigned to: ${task.title}`,
                link: `/task-tracking?task=${task.id}`
              })
            }
          }
        }

        notificationService.broadcastDataChange('tasks')
        res.json(task)
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({
            error: 'Invalid department or assignee ID'
          })
        }
        res.status(500).json({ error: 'Failed to update task' })
      }
    })

    // Delete task
    router.delete('/:id', authenticateToken, requireRole([
      'admin',
      'administrator',
      'manager',
      'project_manager',
      'operations_manager',
      'chief_operations_officer',
    ]), async (req: Request, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

        // Check if task exists
        const existingTask = await this.service.findById(id)
        if (!existingTask) {
          return res.status(404).json({ error: 'Task not found' })
        }

        await this.service.delete(id)
        notificationService.broadcastDataChange('tasks')
        res.json({ message: 'Task deleted successfully' })
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' })
      }
    })

    return router
  }
}
