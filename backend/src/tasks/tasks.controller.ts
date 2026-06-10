import express, { Request, Response, Router } from 'express'
import { TasksService, TaskStatus } from './tasks.service'
import { authenticateToken, requireRole, AuthRequest } from '../auth/auth.middleware'
import { emailService } from '../email/email.service'
import { notificationService } from '../notifications/socket.service'
import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import type { Prisma } from '@prisma/client'
import {
  canReadTask,
  canRequestAssigneeTasks,
  getPrimaryTaskAssignment,
  getTaskVisibilityFilter,
  hasTaskAssignmentPrivilege,
  type PrimaryTaskAssignment,
} from './tasks.permissions'
import { createLogger } from '../observability/logger'

const logger = createLogger('tasks.controller')

interface TaskAccessContext {
  requesterId: string
  isPrivileged: boolean
  primaryAssignment: PrimaryTaskAssignment | null
}

const TASK_PROJECT_STATUSES = new Set(['active', 'paused', 'completed', 'archived'])

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  if (value === undefined) return undefined
  return normalizeOptionalString(value) || null
}

function normalizeProjectStatus(value: unknown): string | undefined {
  const status = normalizeOptionalString(value)
  if (!status) return undefined
  return TASK_PROJECT_STATUSES.has(status) ? status : undefined
}

function parseOptionalStringList(value: unknown, fieldName: string): { ok: true; values?: string[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, values: undefined }
  if (value === null) return { ok: true, values: [] }
  if (!Array.isArray(value)) return { ok: false, error: `${fieldName} must be an array` }

  const values: string[] = []
  for (const item of value) {
    const normalized = normalizeOptionalString(item)
    if (!normalized) return { ok: false, error: `${fieldName} must only include user IDs` }
    values.push(normalized)
  }

  return { ok: true, values: Array.from(new Set(values)) }
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

  private getProjectVisibilityFilter(access: TaskAccessContext): Prisma.TaskProjectWhereInput {
    if (access.isPrivileged) return {}

    const or: Prisma.TaskProjectWhereInput[] = [
      {
        tasks: {
          some: getTaskVisibilityFilter(access),
        },
      },
    ]

    if (access.primaryAssignment?.departmentId) {
      or.push({ departmentId: access.primaryAssignment.departmentId })
    }

    or.push({ departmentId: null })
    return { OR: or }
  }

  private async assertProjectAssignable(
    access: TaskAccessContext,
    projectId?: string | null,
  ): Promise<{ ok: true; projectId?: string | null } | { ok: false; status: number; error: string }> {
    if (projectId === undefined || projectId === null || projectId === '') {
      return { ok: true, projectId: projectId || null }
    }

    const project = await this.service.findProjectById(projectId)
    if (!project) {
      return { ok: false, status: 400, error: 'Invalid project ID' }
    }

    if (!access.isPrivileged) {
      const requesterDepartmentId = access.primaryAssignment?.departmentId
      if (project.departmentId && project.departmentId !== requesterDepartmentId) {
        return { ok: false, status: 403, error: 'You can only use projects in your assigned department' }
      }
    }

    return { ok: true, projectId }
  }

  private notifyTaskCollaborators(task: any, requesterId: string) {
    const collaborators = Array.isArray(task.collaborators) ? task.collaborators : []

    for (const collaborator of collaborators) {
      const userId = collaborator?.userId
      if (!userId || userId === requesterId || userId === task.assigneeId) continue

      notificationService.notifyUser(userId, {
        type: 'info',
        title: 'Task Collaboration Invite',
        message: `You have been invited to collaborate on: ${task.title}`,
        link: `/task-tracking?task=${task.id}`,
      })
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

    router.get('/projects', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const projects = await this.service.findProjects(this.getProjectVisibilityFilter(access))
        res.json(projects)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task projects' })
      }
    })

    router.post('/projects', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        if (!access.isPrivileged) {
          return res.status(403).json({ error: 'Only managers and admins can create task projects' })
        }

        const name = normalizeOptionalString(req.body.name)
        if (!name) {
          return res.status(400).json({ error: 'Project name is required' })
        }

        const status = normalizeProjectStatus(req.body.status) || 'active'
        const project = await this.service.createProject({
          name,
          description: normalizeOptionalNullableString(req.body.description),
          status,
          color: normalizeOptionalNullableString(req.body.color),
          departmentId: normalizeOptionalNullableString(req.body.departmentId),
          ownerId: normalizeOptionalNullableString(req.body.ownerId),
          createdById: access.requesterId,
          startDate: normalizeOptionalNullableString(req.body.startDate),
          targetDate: normalizeOptionalNullableString(req.body.targetDate),
        })

        notificationService.broadcastDataChange('tasks')
        res.status(201).json(project)
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid department or owner ID' })
        }
        res.status(500).json({ error: 'Failed to create task project' })
      }
    })

    router.patch('/projects/:projectId', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        if (!access.isPrivileged) {
          return res.status(403).json({ error: 'Only managers and admins can update task projects' })
        }

        const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId
        const name = req.body.name === undefined ? undefined : normalizeOptionalString(req.body.name)
        if (req.body.name !== undefined && !name) {
          return res.status(400).json({ error: 'Project name cannot be empty' })
        }

        const status = req.body.status === undefined ? undefined : normalizeProjectStatus(req.body.status)
        if (req.body.status !== undefined && !status) {
          return res.status(400).json({ error: 'Invalid project status' })
        }

        const project = await this.service.updateProject(projectId, {
          name,
          description: normalizeOptionalNullableString(req.body.description),
          status,
          color: normalizeOptionalNullableString(req.body.color),
          departmentId: normalizeOptionalNullableString(req.body.departmentId),
          ownerId: normalizeOptionalNullableString(req.body.ownerId),
          startDate: normalizeOptionalNullableString(req.body.startDate),
          targetDate: normalizeOptionalNullableString(req.body.targetDate),
          completedAt: normalizeOptionalNullableString(req.body.completedAt),
        })

        notificationService.broadcastDataChange('tasks')
        res.json(project)
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as Record<string, unknown>).code
          if (code === 'P2025') return res.status(404).json({ error: 'Task project not found' })
          if (code === 'P2003') return res.status(400).json({ error: 'Invalid department or owner ID' })
        }
        res.status(500).json({ error: 'Failed to update task project' })
      }
    })

    router.delete('/projects/:projectId', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        if (!access.isPrivileged) {
          return res.status(403).json({ error: 'Only managers and admins can delete task projects' })
        }

        const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId
        await this.service.deleteProject(projectId)

        notificationService.broadcastDataChange('tasks')
        res.status(204).send()
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2025') {
          return res.status(404).json({ error: 'Task project not found' })
        }
        res.status(500).json({ error: 'Failed to delete task project' })
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
        const { title, description, status, departmentId, assigneeId, priority, startDate, dueDate, notes, estimatedTime, role, projectId } = req.body
        const collaboratorIdsInput = parseOptionalStringList(req.body.collaboratorIds, 'collaboratorIds')
        if (collaboratorIdsInput.ok === false) {
          return res.status(400).json({ error: collaboratorIdsInput.error })
        }

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

        if (!access.isPrivileged && collaboratorIdsInput.values && collaboratorIdsInput.values.length > 0) {
          return res.status(403).json({ error: 'Only managers and admins can invite task collaborators' })
        }

        if (!effectiveDepartmentId) {
          return res.status(400).json({ error: 'Department ID is required' })
        }

        const projectAccess = await this.assertProjectAssignable(access, normalizeOptionalNullableString(projectId))
        if (projectAccess.ok === false) {
          return res.status(projectAccess.status).json({ error: projectAccess.error })
        }

        const task = await this.service.create({
          title,
          description,
          status,
          departmentId: effectiveDepartmentId,
          assigneeId: effectiveAssigneeId,
          createdById: access.requesterId,
          projectId: projectAccess.projectId,
          priority,
          startDate,
          dueDate,
          role: effectiveRole,
          notes,
          estimatedTime,
          collaboratorIds: access.isPrivileged ? collaboratorIdsInput.values : undefined,
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
          ).catch(err => logger.error('Failed to send task assignment email', err))

          // 2. Send Real-time Notification
          notificationService.notifyUser(task.assignee.id, {
            type: 'info',
            title: 'New Task Assigned',
            message: `You have been assigned to: ${task.title}`,
            link: `/task-tracking?task=${task.id}`
          })
        }

        this.notifyTaskCollaborators(task, access.requesterId)

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
        const { title, description, status, departmentId, assigneeId, priority, startDate, dueDate, notes, progress, timerStatus, timerStart, totalElapsed, estimatedTime, role, projectId } = req.body
        const collaboratorIdsInput = parseOptionalStringList(req.body.collaboratorIds, 'collaboratorIds')
        if (collaboratorIdsInput.ok === false) {
          return res.status(400).json({ error: collaboratorIdsInput.error })
        }

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

          const protectedFields = ['assigneeId', 'departmentId', 'role', 'collaboratorIds']
          const requestedProtectedFields = protectedFields.filter((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field),
          )

          if (requestedProtectedFields.length > 0) {
            return res.status(403).json({
              error: 'Only managers and admins can change task assignment, department, role, or collaborators',
            })
          }
        }

        const requestedProjectUpdate = Object.prototype.hasOwnProperty.call(req.body, 'projectId')
        let effectiveProjectId: string | null | undefined
        if (requestedProjectUpdate) {
          const projectAccess = await this.assertProjectAssignable(access, normalizeOptionalNullableString(projectId))
          if (projectAccess.ok === false) {
            return res.status(projectAccess.status).json({ error: projectAccess.error })
          }
          effectiveProjectId = projectAccess.projectId
        }

        const task = await this.service.update(id, {
          title,
          description,
          status,
          departmentId: access.isPrivileged ? departmentId : undefined,
          assigneeId: access.isPrivileged ? assigneeId : undefined,
          projectId: requestedProjectUpdate ? effectiveProjectId : undefined,
          priority,
          startDate,
          dueDate,
          role: access.isPrivileged ? role : undefined,
          notes,
          progress,
          timerStatus,
          timerStart,
          totalElapsed,
          estimatedTime,
          collaboratorIds: access.isPrivileged ? collaboratorIdsInput.values : undefined,
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
          ).catch(err => logger.error('Failed to send status change email', err))

          // 2. Send Real-time Notification
          notificationService.notifyUser(task.assignee.id, {
            type: 'info',
            title: 'Task Updated',
            message: `Task "${task.title}" moved to ${status}`,
            link: `/task-tracking?task=${task.id}`
          })
        }

        if (access.isPrivileged && collaboratorIdsInput.values !== undefined) {
          this.notifyTaskCollaborators(task, access.requesterId)
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
