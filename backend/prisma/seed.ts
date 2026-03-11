import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import * as bcrypt from 'bcrypt'

const connectionString = (process.env.DATABASE_URL || '').trim()

if (!connectionString || connectionString.length < 10) {
    console.error('❌ Error: DATABASE_URL is not defined or too short in your environment!')
    process.exit(1)
}

// Log a safe version of the URL for debugging
const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@')
console.log(`📡 Connecting to: ${maskedUrl}`)

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🌱 Starting refined database seed...')

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

    console.log('✅ Created departments')

    // Seed available roles for signup dropdown
    const availableRoles = [
        { name: 'Web Developer', departmentId: engineering.id },
        { name: 'Head of 3D Modeling', departmentId: engineering.id },
        { name: 'Operations Manager', departmentId: operations.id },
        { name: 'Operations Assistant', departmentId: operations.id },
        { name: 'Project Manager', departmentId: marketing.id },
    ]
    for (const r of availableRoles) {
        await prisma.availableRole.upsert({
            where: { name_departmentId: { name: r.name, departmentId: r.departmentId } },
            update: {},
            create: { name: r.name, departmentId: r.departmentId },
        })
    }
    console.log('✅ Created available roles')

    // Helper to create users with hashing and roles
    const passwordHash = await bcrypt.hash('Savage2025!', 10)

    const createUser = async (
        email: string,
        name: string,
        roleName: string,
        deptId: string,
        status: string = 'active',
        isApproved: boolean = false
    ) => {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                status,
                name,
                isApproved,
                password: passwordHash
            },
            create: {
                email,
                name,
                password: passwordHash,
                avatar: `https://i.pravatar.cc/150?u=${email}`,
                status,
                isApproved,
                appliedDate: status === 'pending' ? new Date() : null,
            },
        })

        await prisma.userRole.upsert({
            where: {
                userId_departmentId_role: {
                    userId: user.id,
                    departmentId: deptId,
                    role: roleName.toLowerCase().replace(/ /g, '_'),
                },
            },
            update: {},
            create: {
                userId: user.id,
                departmentId: deptId,
                role: roleName.toLowerCase().replace(/ /g, '_'),
            },
        })

        await prisma.employeeProfile.upsert({
            where: { userId: user.id },
            update: { jobTitle: roleName },
            create: {
                userId: user.id,
                jobTitle: roleName,
                baseSalary: 50000 + Math.random() * 50000,
            }
        })

        return user
    }

    // 🧹 Purge existing user data for a clean slate
    console.log('🧹 Purging existing user data...')
    await prisma.userRole.deleteMany({})
    await prisma.employeeProfile.deleteMany({})
    await prisma.user.deleteMany({})

    // 👥 Seed Real Employees from provided list
    console.log('👥 Seeding real employees...')

    // 1. Genrou Josh Catacutan (Operations Manager - Approved)
    await createUser(
        'genroujoshcatacutan25@gmail.com',
        'Genrou Josh Catacutan',
        'Operations Manager',
        operations.id,
        'active',
        true
    )

    // 2. Daryl Dave Caña (Operations Assistant - Not yet approved/Pending)
    await createUser(
        'daryldave018@gmail.com',
        'Daryl Dave Caña',
        'Operations Assistant',
        operations.id,
        'pending',
        false
    )

    // 3. Peter John Singalivo (Head of 3D Modeling)
    await createUser(
        'petersingalivo.prof@gmail.com',
        'Peter John Singalivo',
        'Head of 3D Modeling',
        engineering.id,
        'pending',
        false
    )

    // 4. Pol Danyael H. Villorente (Web Developer)
    await createUser(
        'pdvillorente12@gmail.com',
        'Pol Danyael H. Villorente',
        'Web Developer',
        engineering.id,
        'pending',
        false
    )

    // 5. Caetanya Arcipe (Project Manager)
    await createUser(
        'caetanya1@gmail.com',
        'Caetanya Arcipe',
        'Project Manager',
        marketing.id,
        'pending',
        false
    )

    // 7. Admin Account (Admin)
    await createUser(
        'admin@savage.com',
        'Admin',
        'admin',
        operations.id,
        'active',
        true
    )

    console.log('🎉 Database seeded successfully with real employees and Admin!')
    console.log('👉 Default password for all: Savage2025!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed!')
        console.error('Error Name:', e.name)
        console.error('Error Message:', e.message)
        console.error('Full Error:', JSON.stringify(e, null, 2))
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
