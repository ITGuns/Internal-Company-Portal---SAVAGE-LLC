import { PrismaClient, AvailableRole } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { mergeSignupRolesForDepartment, type SignupRoleOption } from '../auth/signup-role-options'

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
    async findAll(): Promise<SignupRoleOption[]> {
        const departments = await this.prisma.department.findMany({
            include: {
                availableRoles: true,
            },
            orderBy: {
                name: 'asc',
            },
        })

        return departments
            .flatMap((department) => mergeSignupRolesForDepartment(department))
            .sort((left, right) =>
                (left.department?.name || '').localeCompare(right.department?.name || '') ||
                left.name.localeCompare(right.name)
            )
    }

    /**
     * Get roles by department
     */
    async findByDepartment(departmentId: string): Promise<SignupRoleOption[]> {
        const department = await this.prisma.department.findUnique({
            where: { id: departmentId },
            include: {
                availableRoles: true,
            },
        })

        if (!department) return []

        return mergeSignupRolesForDepartment(department).sort((left, right) =>
            left.name.localeCompare(right.name)
        )
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
