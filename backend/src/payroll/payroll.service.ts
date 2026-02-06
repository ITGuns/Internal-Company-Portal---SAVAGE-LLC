import { PrismaClient, TimeEntry, PayrollEvent } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export class PayrollService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async getEvents() {
        return this.prisma.payrollEvent.findMany({
            orderBy: { date: 'asc' }
        })
    }

    async getTimeEntries(userId: string, start?: Date, end?: Date) {
        return this.prisma.timeEntry.findMany({
            where: {
                userId,
                start: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { start: 'desc' }
        })
    }

    async clockIn(userId: string) {
        // Check if already clocked in
        const openEntry = await this.prisma.timeEntry.findFirst({
            where: { userId, end: null }
        })
        if (openEntry) throw new Error('Already clocked in')

        return this.prisma.timeEntry.create({
            data: {
                userId,
                start: new Date()
            }
        })
    }

    async clockOut(userId: string) {
        const openEntry = await this.prisma.timeEntry.findFirst({
            where: { userId, end: null }
        })
        if (!openEntry) throw new Error('Not clocked in')

        const end = new Date()
        const duration = Math.round((end.getTime() - openEntry.start.getTime()) / 60000)

        return this.prisma.timeEntry.update({
            where: { id: openEntry.id },
            data: {
                end,
                duration
            }
        })
    }

    async addManualEntry(userId: string, start: Date, end: Date | null, notes?: string) {
        let duration = null
        if (end) {
            duration = Math.round((end.getTime() - start.getTime()) / 60000)
        }
        return this.prisma.timeEntry.create({
            data: {
                userId,
                start,
                end,
                duration,
                notes
            }
        })
    }

    async deleteTimeEntry(id: string, userId: string) {
        // Ensure user owns entry (or is admin, but simplified here)
        return this.prisma.timeEntry.delete({
            where: { id, userId } // Safety check
        })
    }
}
