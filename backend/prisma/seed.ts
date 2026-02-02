import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // Create departments
    const engineering = await prisma.department.upsert({
        where: { name: 'Engineering' },
        update: {},
        create: {
            name: 'Engineering',
            driveId: 'sample-drive-id-engineering',
        },
    })

    const marketing = await prisma.department.upsert({
        where: { name: 'Marketing' },
        update: {},
        create: {
            name: 'Marketing',
            driveId: 'sample-drive-id-marketing',
        },
    })

    const operations = await prisma.department.upsert({
        where: { name: 'Operations' },
        update: {},
        create: {
            name: 'Operations',
            driveId: 'sample-drive-id-operations',
        },
    })

    console.log('✅ Created departments:', { engineering, marketing, operations })

    // Create users
    const john = await prisma.user.upsert({
        where: { email: 'john.doe@savage.com' },
        update: {},
        create: {
            email: 'john.doe@savage.com',
            name: 'John Doe',
            avatar: 'https://i.pravatar.cc/150?img=12',
        },
    })

    const jane = await prisma.user.upsert({
        where: { email: 'jane.smith@savage.com' },
        update: {},
        create: {
            email: 'jane.smith@savage.com',
            name: 'Jane Smith',
            avatar: 'https://i.pravatar.cc/150?img=5',
        },
    })

    const mike = await prisma.user.upsert({
        where: { email: 'mike.johnson@savage.com' },
        update: {},
        create: {
            email: 'mike.johnson@savage.com',
            name: 'Mike Johnson',
            avatar: 'https://i.pravatar.cc/150?img=33',
        },
    })

    console.log('✅ Created users:', { john, jane, mike })

    // Create user roles
    await prisma.userRole.upsert({
        where: {
            userId_departmentId_role: {
                userId: john.id,
                departmentId: engineering.id,
                role: 'admin',
            },
        },
        update: {},
        create: {
            userId: john.id,
            departmentId: engineering.id,
            role: 'admin',
        },
    })

    await prisma.userRole.upsert({
        where: {
            userId_departmentId_role: {
                userId: jane.id,
                departmentId: marketing.id,
                role: 'manager',
            },
        },
        update: {},
        create: {
            userId: jane.id,
            departmentId: marketing.id,
            role: 'manager',
        },
    })

    await prisma.userRole.upsert({
        where: {
            userId_departmentId_role: {
                userId: mike.id,
                departmentId: operations.id,
                role: 'member',
            },
        },
        update: {},
        create: {
            userId: mike.id,
            departmentId: operations.id,
            role: 'member',
        },
    })

    console.log('✅ Created user roles')

    // Create tasks
    const tasks = await Promise.all([
        prisma.task.create({
            data: {
                title: 'Update employee handbook',
                description: 'Review and update the employee handbook with new policies',
                status: 'todo',
                departmentId: operations.id,
                assigneeId: mike.id,
            },
        }),
        prisma.task.create({
            data: {
                title: 'API documentation update',
                description: 'Document new API endpoints for the internal portal',
                status: 'in_progress',
                departmentId: engineering.id,
                assigneeId: john.id,
            },
        }),
        prisma.task.create({
            data: {
                title: 'Q1 Marketing campaign',
                description: 'Plan and execute Q1 marketing campaign',
                status: 'review',
                departmentId: marketing.id,
                assigneeId: jane.id,
            },
        }),
        prisma.task.create({
            data: {
                title: 'Database migration',
                description: 'Migrate legacy database to new PostgreSQL instance',
                status: 'completed',
                departmentId: engineering.id,
                assigneeId: john.id,
            },
        }),
        prisma.task.create({
            data: {
                title: 'Social media strategy',
                description: 'Develop social media strategy for 2026',
                status: 'todo',
                departmentId: marketing.id,
            },
        }),
    ])

    console.log(`✅ Created ${tasks.length} tasks`)

    console.log('🎉 Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
