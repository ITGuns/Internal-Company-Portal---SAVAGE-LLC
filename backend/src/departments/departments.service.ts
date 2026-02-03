import { PrismaClient, Department } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateDepartmentDto {
    name: string
    driveId?: string
}

export interface UpdateDepartmentDto {
    name?: string
    driveId?: string
}

export class DepartmentsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    /**
     * Get all departments
     */
    async findAll(): Promise<Department[]> {
        return this.prisma.department.findMany({
            include: {
                _count: {
                    select: {
                        tasks: true,
                        userRoles: true
                    }
                }
            },
            orderBy: {
                name: 'asc',
            },
        })
    }

    /**
     * Get department by ID
     */
    async findById(id: string): Promise<Department | null> {
        return this.prisma.department.findUnique({
            where: { id },
            include: {
                tasks: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                },
                userRoles: {
                    include: {
                        user: true
                    }
                },
                _count: {
                    select: {
                        tasks: true,
                        userRoles: true
                    }
                }
            },
        })
    }

    /**
     * Create new department
     */
    async create(data: CreateDepartmentDto): Promise<Department> {
        return this.prisma.department.create({
            data: {
                name: data.name,
                driveId: data.driveId,
            },
        })
    }

    /**
     * Update department
     */
    async update(id: string, data: UpdateDepartmentDto): Promise<Department> {
        return this.prisma.department.update({
            where: { id },
            data: {
                name: data.name,
                driveId: data.driveId,
            },
        })
    }

    /**
     * Delete department
     */
    async delete(id: string): Promise<Department> {
        return this.prisma.department.delete({
            where: { id },
        })
    }
}
