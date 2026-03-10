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

// Task with relations type
export type TaskWithRelations = Task & {
  department: { id: string; name: string; driveId: string | null; createdAt: Date; updatedAt: Date } | null
  assignee: { id: string; email: string; name: string | null; avatar: string | null } | null
}

export class TasksService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = prisma
  }

  /**
   * Get all tasks (with optional pagination)
   */
  async findAll(page?: number, limit?: number) {
    const include = {
      department: true,
      assignee: {
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      },
    }

    const orderBy = { createdAt: 'desc' as const }

    if (page !== undefined && limit !== undefined) {
      const [data, total] = await Promise.all([
        this.prisma.task.findMany({
          include,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.task.count(),
      ])
      return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
    }

    return this.prisma.task.findMany({
      include,
      orderBy,
    })
  }

  /**
   * Get task by ID
   */
  async findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id },
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
      },
    })
  }

  /**
   * Get tasks by department
   */
  async findByDepartment(departmentId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { departmentId },
      include: {
        assignee: {
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
   * Get tasks by assignee
   */
  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { assigneeId },
      include: {
        department: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get tasks by status
   */
  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { status },
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
        priority: data.priority || 'Med',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        role: data.role,
        notes: data.notes ?? undefined,
        progress: 0,
        timerStatus: 'stopped',
        totalElapsed: 0,
        estimatedTime: (data as any).estimatedTime ?? undefined,
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
      },
    }) as Promise<TaskWithRelations>
  }

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskDto): Promise<TaskWithRelations> {
    return this.prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        departmentId: data.departmentId,
        assigneeId: data.assigneeId,
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
      },
    }) as Promise<TaskWithRelations>
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
  async search(query: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
