import { PrismaClient, User } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { emailService } from '../email/email.service'

export interface CreateEmployeeDto {
    email: string
    name: string
    role: string
    department: string
    salary: number
}

export class EmployeesService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    /**
     * Get all pending applications
     */
    async getPending(): Promise<User[]> {
        return this.prisma.user.findMany({
            where: {
                status: 'pending',
            },
            include: {
                employeeProfile: true
            },
            orderBy: {
                appliedDate: 'desc',
            },
        })
    }

    /**
     * Get all deployed employees
     */
    async getDeployed(): Promise<User[]> {
        return this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'vacation', 'leave'],
                },
            },
            include: {
                employeeProfile: true
            },
            orderBy: {
                name: 'asc',
            },
        })
    }

    /**
     * Create a pending employee application
     */
    async createPending(data: CreateEmployeeDto): Promise<User> {
        // Create user with pending status
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                status: 'pending',
                appliedDate: new Date(),
                // Store role/department info - we might need to extend the User model further 
                // but for now let's use what we have. 
                // In a real app, we'd create UserRole or EmployeeProfile too.
            },
        })

        // Also create an EmployeeProfile if needed
        await this.prisma.employeeProfile.create({
            data: {
                userId: user.id,
                jobTitle: data.role,
                baseSalary: data.salary,
                // We could map department too if we had the ID
            },
        })

        return user
    }

    /**
     * Approve a pending employee
     */
    async approve(id: string): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                status: 'active',
            },
        })

        // Auto-add to General channel if it exists
        try {
            const generalChannel = await this.prisma.conversation.findFirst({
                where: { name: 'General', type: 'group' }
            })

            if (generalChannel) {
                await this.prisma.participant.upsert({
                    where: {
                        conversationId_userId: {
                            conversationId: generalChannel.id,
                            userId: user.id
                        }
                    },
                    update: {},
                    create: {
                        conversationId: generalChannel.id,
                        userId: user.id
                    }
                })
            }
        } catch (err) {
            console.error('Failed to auto-add user to General channel:', err)
        }

        return user
    }

    /**
     * Reject a pending employee
     */
    async reject(id: string): Promise<User> {
        // We could just delete them or mark as rejected. 
        // For now, let's delete to keep the DB clean, or update status to 'rejected'
        return this.prisma.user.update({
            where: { id },
            data: {
                status: 'rejected',
            },
        })
    }
}
