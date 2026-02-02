import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma Client
class PrismaService {
    private static instance: PrismaClient | null = null

    static getInstance(): PrismaClient {
        if (!PrismaService.instance) {
            PrismaService.instance = new PrismaClient()

            // Handle graceful shutdown
            process.on('beforeExit', async () => {
                await PrismaService.disconnect()
            })
        }

        return PrismaService.instance
    }

    static async connect(): Promise<void> {
        try {
            const prisma = PrismaService.getInstance()
            await prisma.$connect()
            console.log('Database connected successfully')
        } catch (error) {
            console.error('Failed to connect to database:', error)
            throw error
        }
    }

    static async disconnect(): Promise<void> {
        if (PrismaService.instance) {
            await PrismaService.instance.$disconnect()
            console.log('Database disconnected')
            PrismaService.instance = null
        }
    }

    static async healthCheck(): Promise<boolean> {
        try {
            const prisma = PrismaService.getInstance()
            await prisma.$queryRaw`SELECT 1`
            return true
        } catch (error) {
            console.error('Database health check failed:', error)
            return false
        }
    }
}

export const prisma = PrismaService.getInstance()
export { PrismaService }
