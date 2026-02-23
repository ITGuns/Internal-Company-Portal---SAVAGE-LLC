import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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

    // Helper to create users with roles
    const createUser = async (email: string, name: string, roleName: string, deptId: string, status: string = 'active', avatar?: string) => {
        const user = await prisma.user.upsert({
            where: { email },
            update: { status, name, avatar },
            create: {
                email,
                name,
                avatar: avatar || `https://i.pravatar.cc/150?u=${email}`,
                status,
                appliedDate: status === 'pending' ? new Date() : null,
            },
        })

        await prisma.userRole.upsert({
            where: {
                userId_departmentId_role: {
                    userId: user.id,
                    departmentId: deptId,
                    role: roleName.toLowerCase(),
                },
            },
            update: {},
            create: {
                userId: user.id,
                departmentId: deptId,
                role: roleName.toLowerCase(),
            },
        })

        if (status === 'active') {
            await prisma.employeeProfile.upsert({
                where: { userId: user.id },
                update: { jobTitle: roleName },
                create: {
                    userId: user.id,
                    jobTitle: roleName,
                    baseSalary: 50000 + Math.random() * 50000,
                }
            })
        }

        return user
    }

    // 11 Deployed Employees
    await createUser('john.doe@savage.com', 'John Doe', 'Senior Engineer', engineering.id)
    await createUser('jane.smith@savage.com', 'Jane Smith', 'Marketing Manager', marketing.id)
    await createUser('mike.johnson@savage.com', 'Mike Johnson', 'Operations Specialist', operations.id)
    await createUser('sarah.wilson@savage.com', 'Sarah Wilson', 'Frontend Lead', engineering.id)
    await createUser('david.brown@savage.com', 'David Brown', 'Backend Developer', engineering.id)
    await createUser('emily.davis@savage.com', 'Emily Davis', 'UX Designer', marketing.id)
    await createUser('chris.evans@savage.com', 'Chris Evans', 'Logistics Manager', operations.id)
    await createUser('anna.kendrick@savage.com', 'Anna Kendrick', 'HR Specialist', operations.id)
    await createUser('robert.downey@savage.com', 'Robert Downey', 'CEO', operations.id)
    await createUser('scarlett.j@savage.com', 'Scarlett Johansson', 'Brand Lead', marketing.id)
    await createUser('tom.holland@savage.com', 'Tom Holland', 'Junior Developer', engineering.id)

    // 3 Pending Employees
    const p1 = await createUser('peter.parker@savage.com', 'Peter Parker', 'Intern', engineering.id, 'pending')
    const p2 = await createUser('bruce.wayne@savage.com', 'Bruce Wayne', 'Security Consultant', operations.id, 'pending')
    const p3 = await createUser('natasha.romanoff@savage.com', 'Natasha Romanoff', 'Intelligence Analyst', marketing.id, 'pending')

    // Create a General channel and add all users
    const allUsers = await prisma.user.findMany({ select: { id: true } })
    await prisma.conversation.create({
        data: {
            type: 'group',
            name: 'General',
            participants: {
                create: allUsers.map(u => ({ userId: u.id }))
            }
        }
    })

    console.log('🎉 Database seeded successfully with 11 deployed, 3 pending employees, and a General channel!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
