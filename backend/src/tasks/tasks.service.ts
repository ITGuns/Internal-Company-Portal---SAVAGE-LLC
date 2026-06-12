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
  projectId?: string | null
  priority?: string
  startDate?: Date | string | null
  dueDate?: Date | string | null
  role?: string
  notes?: Prisma.JsonValue
  progress?: number
  timerStatus?: string
  timerStart?: Date | string
  totalElapsed?: number
  estimatedTime?: number
  collaboratorIds?: string[]
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  departmentId?: string
  assigneeId?: string
  projectId?: string | null
  assigneeIds?: string[]
  priority?: string
  startDate?: Date | string | null
  dueDate?: Date | string | null
  role?: string
  notes?: Prisma.JsonValue
  progress?: number
  timerStatus?: string
  timerStart?: Date | string
  totalElapsed?: number
  estimatedTime?: number
  collaboratorIds?: string[]
}

interface UpdateTaskOptions {
  actorId?: string
}

export interface CreateTaskProjectDto {
  name: string
  description?: string | null
  status?: string
  color?: string | null
  departmentId?: string | null
  ownerId?: string | null
  createdById?: string | null
  startDate?: Date | string | null
  targetDate?: Date | string | null
}

export interface UpdateTaskProjectDto {
  name?: string
  description?: string | null
  status?: string
  color?: string | null
  departmentId?: string | null
  ownerId?: string | null
  startDate?: Date | string | null
  targetDate?: Date | string | null
  completedAt?: Date | string | null
}

// Task with relations type
export type TaskWithRelations = Task & {
  department: { id: string; name: string; driveId: string | null; createdAt: Date; updatedAt: Date } | null
  assignee: { id: string; email: string; name: string | null; avatar: string | null } | null
  creator: { id: string; email: string; name: string | null; avatar: string | null } | null
  collaborators: Array<{
    id: string
    taskId: string
    userId: string
    invitedById: string | null
    status: string
    createdAt: Date
    updatedAt: Date
    user: { id: string; email: string; name: string | null; avatar: string | null }
    invitedBy: { id: string; email: string; name: string | null; avatar: string | null } | null
  }>
  project: {
    id: string
    name: string
    description: string | null
    status: string
    color: string | null
    departmentId: string | null
    ownerId: string | null
    createdById: string | null
    startDate: Date | null
    targetDate: Date | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
  } | null
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

function normalizeCollaboratorIds(ids?: string[], excludedIds: Array<string | null | undefined> = []): string[] {
  if (!ids) return []

  const excluded = new Set(excludedIds.filter(Boolean).map(String))
  const normalized = ids
    .map((id) => String(id || '').trim())
    .filter((id) => id && !excluded.has(id))

  return Array.from(new Set(normalized))
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
      project: true,
      collaborators: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          user: { select: userSummarySelect },
          invitedBy: { select: userSummarySelect },
        },
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
        project: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: userSummarySelect,
            },
            invitedBy: {
              select: userSummarySelect,
            },
          },
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
        project: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: userSummarySelect },
            invitedBy: { select: userSummarySelect },
          },
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
        project: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
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
        project: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: userSummarySelect },
            invitedBy: { select: userSummarySelect },
          },
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
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }
    const collaboratorIds = normalizeCollaboratorIds(data.collaboratorIds, [data.assigneeId])

    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        departmentId: data.departmentId,
        assigneeId: data.assigneeId,
        assigneeIds: data.assigneeIds ? JSON.parse(JSON.stringify(data.assigneeIds)) : undefined,
        createdById: data.createdById,
        projectId: data.projectId || undefined,
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
        collaborators: collaboratorIds.length > 0
          ? {
              create: collaboratorIds.map((userId) => ({
                userId,
                invitedById: data.createdById,
                status: 'invited',
              })),
            }
          : undefined,
      },
      include: {
        department: true,
        assignee: {
          select: userSummarySelect,
        },
        creator: {
          select: userSummarySelect,
        },
        project: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: userSummarySelect },
            invitedBy: { select: userSummarySelect },
          },
        },
      },
    }) as Promise<TaskWithRelations>
  }

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskDto, options: UpdateTaskOptions = {}): Promise<TaskWithRelations> {
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }
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
      const nextAssigneeId = data.assigneeId === undefined ? existingTask?.assigneeId : data.assigneeId
      const collaboratorIds = data.collaboratorIds === undefined
        ? undefined
        : normalizeCollaboratorIds(data.collaboratorIds, [nextAssigneeId])

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

      if (collaboratorIds !== undefined) {
        await tx.taskCollaborator.deleteMany({
          where: collaboratorIds.length > 0
            ? { taskId: id, userId: { notIn: collaboratorIds } }
            : { taskId: id },
        })

        for (const userId of collaboratorIds) {
          await tx.taskCollaborator.upsert({
            where: {
              taskId_userId: {
                taskId: id,
                userId,
              },
            },
            update: {
              status: 'invited',
              ...(options.actorId ? { invitedById: options.actorId } : {}),
            },
            create: {
              taskId: id,
              userId,
              invitedById: options.actorId,
              status: 'invited',
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
          projectId: data.projectId === undefined ? undefined : data.projectId || null,
          priority: data.priority,
          startDate: data.startDate === undefined ? undefined : data.startDate ? new Date(data.startDate) : null,
          dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
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
            select: userSummarySelect,
          },
          creator: {
            select: userSummarySelect,
          },
          project: true,
          collaborators: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: userSummarySelect },
              invitedBy: { select: userSummarySelect },
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
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }

    return this.prisma.task.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { department: { name: { contains: query, mode: 'insensitive' } } },
              { project: { name: { contains: query, mode: 'insensitive' } } },
              { assignee: { name: { contains: query, mode: 'insensitive' } } },
              { assignee: { email: { contains: query, mode: 'insensitive' } } },
              { creator: { name: { contains: query, mode: 'insensitive' } } },
              { creator: { email: { contains: query, mode: 'insensitive' } } },
              {
                collaborators: {
                  some: {
                    OR: [
                      { user: { name: { contains: query, mode: 'insensitive' } } },
                      { user: { email: { contains: query, mode: 'insensitive' } } },
                    ],
                  },
                },
              },
            ],
          },
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
        project: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: userSummarySelect },
            invitedBy: { select: userSummarySelect },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findProjects(where: Prisma.TaskProjectWhereInput = {}) {
    const userSummarySelect = {
      id: true,
      email: true,
      name: true,
      avatar: true,
    }

    return this.prisma.taskProject.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: userSummarySelect,
        },
        creator: {
          select: userSummarySelect,
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' },
      ],
    })
  }

  async findProjectById(id: string) {
    return this.prisma.taskProject.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    })
  }

  async createProject(data: CreateTaskProjectDto) {
    return this.prisma.taskProject.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status || 'active',
        color: data.color,
        departmentId: data.departmentId || undefined,
        ownerId: data.ownerId || undefined,
        createdById: data.createdById || undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    })
  }

  async updateProject(id: string, data: UpdateTaskProjectDto) {
    const statusCompletedAt =
      data.status === 'completed'
        ? (data.completedAt === undefined ? new Date() : data.completedAt ? new Date(data.completedAt) : null)
        : data.status && data.status !== 'completed'
          ? null
          : data.completedAt === undefined
            ? undefined
            : data.completedAt
              ? new Date(data.completedAt)
              : null

    return this.prisma.taskProject.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description === undefined ? undefined : data.description,
        status: data.status,
        color: data.color === undefined ? undefined : data.color,
        departmentId: data.departmentId === undefined ? undefined : data.departmentId || null,
        ownerId: data.ownerId === undefined ? undefined : data.ownerId || null,
        startDate: data.startDate === undefined ? undefined : data.startDate ? new Date(data.startDate) : null,
        targetDate: data.targetDate === undefined ? undefined : data.targetDate ? new Date(data.targetDate) : null,
        completedAt: statusCompletedAt,
      },
    })
  }

  async deleteProject(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { projectId: id },
        data: { projectId: null },
      })

      await tx.taskProject.delete({
        where: { id },
      })
    })
  }
}
