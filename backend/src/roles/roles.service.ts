import { PrismaClient, AvailableRole } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateRoleDto {
    name: string
    departmentId?: string
}

export class RolesService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    /**
     * Get all available roles
     */
    async findAll(): Promise<AvailableRole[]> {
        return this.prisma.availableRole.findMany({
            include: {
                department: true
            },
            orderBy: {
                name: 'asc',
            },
        })
    }

    /**
     * Get roles by department
     */
    async findByDepartment(departmentId: string): Promise<AvailableRole[]> {
        return this.prisma.availableRole.findMany({
            where: { departmentId },
            orderBy: {
                name: 'asc',
            },
        })
    }

    /**
     * Create new role
     */
    async create(data: CreateRoleDto): Promise<AvailableRole> {
        return this.prisma.availableRole.create({
            data: {
                name: data.name,
                departmentId: data.departmentId,
            },
        })
    }

    /**
     * Delete role
     */
    async delete(id: string): Promise<AvailableRole> {
        return this.prisma.availableRole.delete({
            where: { id },
        })
    }
}
