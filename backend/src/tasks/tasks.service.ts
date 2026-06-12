import { PrismaClient, Task, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'

// Task status type
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed'

export interface CreateTaskDto {
  title: string
  description?: string
  status?: TaskStatus
  departmentId: string
  assigneeId?: string
  assigneeIds?: string[]
  createdById?: string
  priority?: string
  startDate?: Date | string
  dueDate?: Date | string
  role?: string
  notes?: Prisma.JsonValue
  progress?: number
  timerStatus?: string
  timerStart?: Date | string
  totalElapsed?: number
  estimatedTime?: number
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  departmentId?: string
  assigneeId?: string
  assigneeIds?: string[]
  priority?: string
  startDate?: Date | string
  dueDate?: Date | string
  role?: string
  notes?: Prisma.JsonValue
  progress?: number
  timerStatus?: string
  timerStart?: Date | string
  totalElapsed?: number
  estimatedTime?: number
}

interface UpdateTaskOptions {
  actorId?: string
}

// Task with relations type
export type TaskWithRelations = Task & {
  department: { id: string; name: string; driveId: string | null; createdAt: Date; updatedAt: Date } | null
  assignee: { id: string; email: string; name: string | null; avatar: string | null } | null
  creator: { id: string; email: string; name: string | null; avatar: string | null } | null
}

export type TaskDetailWithRelations = TaskWithRelations & {
  workSessions: Array<{
    id: string
    taskId: string
    userId: string
    startedAt: Date
    endedAt: Date
    durationSeconds: number
    createdAt: Date
    user: { id: string; email: string; name: string | null; avatar: string | null }
  }>
}

export class TasksService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = prisma
  }

  /**
   * Get all tasks (with optional pagination)
   */
  async findAll(page?: number, limit?: number, where: Prisma.TaskWhereInput = {}) {
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }

    const include = {
      department: true,
      assignee: {
        select: userSummarySelect,
      },
      creator: {
        select: userSummarySelect,
      },
    }

    const orderBy = { createdAt: 'desc' as const }

    if (page !== undefined && limit !== undefined) {
      const [data, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          include,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.task.count({ where }),
      ])
      return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
    }

    return this.prisma.task.findMany({
      where,
      include,
      orderBy,
    })
  }

  /**
   * Get task by ID
   */
  async findById(id: string): Promise<TaskDetailWithRelations | null> {
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }

    return this.prisma.task.findUnique({
      where: { id },
      include: {
        department: true,
        assignee: {
          select: userSummarySelect,
        },
        creator: {
          select: userSummarySelect,
        },
        workSessions: {
          orderBy: { startedAt: 'desc' },
          include: {
            user: {
              select: userSummarySelect,
            },
          },
        },
      },
    }) as Promise<TaskDetailWithRelations | null>
  }

  /**
   * Get tasks by department
   */
  async findByDepartment(departmentId: string, visibilityWhere: Prisma.TaskWhereInput = {}): Promise<Task[]> {
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }

    return this.prisma.task.findMany({
      where: {
        AND: [
          { departmentId },
          visibilityWhere,
        ],
      },
      include: {
        assignee: {
          select: userSummarySelect,
        },
        creator: {
          select: userSummarySelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get tasks by assignee
   */
  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { assigneeId },
      include: {
        department: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get tasks by status
   */
  async findByStatus(status: TaskStatus, visibilityWhere: Prisma.TaskWhereInput = {}): Promise<Task[]> {
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }

    return this.prisma.task.findMany({
      where: {
        AND: [
          { status },
          visibilityWhere,
        ],
      },
      include: {
        department: true,
        assignee: {
          select: userSummarySelect,
        },
        creator: {
          select: userSummarySelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Create new task
   */
  async create(data: CreateTaskDto): Promise<TaskWithRelations> {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        departmentId: data.departmentId,
        assigneeId: data.assigneeId,
        assigneeIds: data.assigneeIds ? JSON.parse(JSON.stringify(data.assigneeIds)) : undefined,
        createdById: data.createdById,
        priority: data.priority || 'Med',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        role: data.role,
        notes: data.notes ?? undefined,
        progress: 0,
        timerStatus: 'stopped',
        totalElapsed: 0,
        estimatedTime: (data as any).estimatedTime ?? undefined,
        completedAt: data.status === 'completed' ? new Date() : undefined,
      },
      include: {
        department: true,
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    }) as Promise<TaskWithRelations>
  }

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskDto, options: UpdateTaskOptions = {}): Promise<TaskWithRelations> {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      select: {
        assigneeId: true,
        status: true,
        timerStatus: true,
        timerStart: true,
        totalElapsed: true,
      },
    })

    const completedAt =
      data.status === 'completed' && existingTask?.status !== 'completed'
        ? new Date()
        : data.status && data.status !== 'completed'
          ? null
          : undefined

    const shouldCloseWorkSession =
      existingTask?.timerStatus === 'playing' &&
      existingTask.timerStart &&
      (data.timerStatus === 'paused' || data.timerStatus === 'stopped' || data.status === 'completed')

    return this.prisma.$transaction(async (tx) => {
      if (shouldCloseWorkSession && existingTask?.timerStart) {
        const endedAt = new Date()
        const userId = existingTask.assigneeId || options.actorId
        const previousElapsed = existingTask.totalElapsed || 0
        const nextElapsed = data.totalElapsed ?? previousElapsed
        const elapsedDelta = nextElapsed > previousElapsed ? nextElapsed - previousElapsed : 0
        const clockDelta = Math.max(0, Math.floor((endedAt.getTime() - existingTask.timerStart.getTime()) / 1000))
        const durationSeconds = elapsedDelta || clockDelta

        if (userId && durationSeconds > 0) {
          await tx.taskWorkSession.create({
            data: {
              taskId: id,
              userId,
              startedAt: existingTask.timerStart,
              endedAt,
              durationSeconds,
            },
          })
        }
      }

      return tx.task.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          departmentId: data.departmentId,
          assigneeId: data.assigneeId,
          assigneeIds: data.assigneeIds === undefined ? undefined : (data.assigneeIds ? JSON.parse(JSON.stringify(data.assigneeIds)) : null),
          priority: data.priority,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          role: data.role,
          notes: data.notes === undefined ? undefined : data.notes,
          progress: data.progress ?? undefined,
          timerStatus: data.timerStatus ?? undefined,
          timerStart: data.timerStart ? new Date(data.timerStart) : (data.timerStatus === 'paused' || data.timerStatus === 'stopped' ? null : undefined),
          totalElapsed: data.totalElapsed ?? undefined,
          estimatedTime: data.estimatedTime ?? undefined,
          completedAt,
        },
        include: {
          department: true,
          assignee: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
      }) as Promise<TaskWithRelations>
    })
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<Task> {
    return this.prisma.task.delete({
      where: { id },
    })
  }

  /**
   * Search tasks by title or description
   */
  async search(query: string, visibilityWhere: Prisma.TaskWhereInput = {}): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          visibilityWhere,
        ],
      },
      include: {
        department: true,
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
