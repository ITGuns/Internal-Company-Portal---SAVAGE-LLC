import { PrismaClient, Task } from '@prisma/client'
import { prisma } from '../database/prisma.service'

// Task status type
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed'

export interface CreateTaskDto {
  title: string
  description?: string
  status?: TaskStatus
  departmentId: string
  assigneeId?: string
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  departmentId?: string
  assigneeId?: string
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
   * Get all tasks
   */
  async findAll(): Promise<Task[]> {
    return this.prisma.task.findMany({
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
