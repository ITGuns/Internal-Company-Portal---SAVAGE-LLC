import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import * as bcrypt from 'bcrypt'
import { upsertClientServiceTierPresets } from '../src/clients/client-service-tier-presets'

const connectionString = (process.env.DATABASE_URL || '').trim()
const seedPassword = (process.env.SEED_DEFAULT_PASSWORD || '').trim()
const resetUsers = process.env.SEED_RESET_USERS === 'true'

if (!connectionString || connectionString.length < 10) {
    console.error('Error: DATABASE_URL is not defined or too short in your environment.')
    process.exit(1)
}

if (!seedPassword || seedPassword.length < 12) {
    console.error('Error: SEED_DEFAULT_PASSWORD must be set to a local-only password with at least 12 characters.')
    process.exit(1)
}

const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@')
console.log(`Connecting to: ${maskedUrl}`)

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function isLocalDatabaseUrl(url: string): boolean {
    return /\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::|\/)/i.test(url)
}

const DEMO_DEPARTMENTS = {
    engineering: {
        name: 'Engineering',
        driveId: 'sample-drive-id-engineering',
    },
    marketing: {
        name: 'Marketing',
        driveId: 'sample-drive-id-marketing',
    },
    operations: {
        name: 'Operations',
        driveId: 'sample-drive-id-operations',
    },
}

async function main() {
    console.log('Starting synthetic local database seed...')

    const engineering = await prisma.department.upsert({
        where: { name: DEMO_DEPARTMENTS.engineering.name },
        update: {},
        create: DEMO_DEPARTMENTS.engineering,
    })

    const marketing = await prisma.department.upsert({
        where: { name: DEMO_DEPARTMENTS.marketing.name },
        update: {},
        create: DEMO_DEPARTMENTS.marketing,
    })

    const operations = await prisma.department.upsert({
        where: { name: DEMO_DEPARTMENTS.operations.name },
        update: {},
        create: DEMO_DEPARTMENTS.operations,
    })

    console.log('Created departments')

    const availableRoles = [
        { name: 'Web Developer', departmentId: engineering.id },
        { name: 'Head of 3D Modeling', departmentId: engineering.id },
        { name: 'Operations Manager', departmentId: operations.id },
        { name: 'Operations Assistant', departmentId: operations.id },
        { name: 'Project Manager', departmentId: marketing.id },
    ]

    for (const role of availableRoles) {
        await prisma.availableRole.upsert({
            where: { name_departmentId: { name: role.name, departmentId: role.departmentId } },
            update: {},
            create: { name: role.name, departmentId: role.departmentId },
        })
    }

    console.log('Created available roles')

    const seededServiceTiers = await upsertClientServiceTierPresets(prisma)
    console.log(`Created/updated ${seededServiceTiers.length} default client service tiers`)

    const passwordHash = await bcrypt.hash(seedPassword, 10)

    const createUser = async (
        email: string,
        name: string,
        roleName: string,
        deptId: string,
        status = 'active',
        isApproved = false,
    ) => {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                status,
                name,
                isApproved,
                password: passwordHash,
            },
            create: {
                email,
                name,
                password: passwordHash,
                avatar: null,
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
                baseSalary: 50000,
            },
        })

        return user
    }

    if (resetUsers) {
        if (!isLocalDatabaseUrl(connectionString)) {
            throw new Error('SEED_RESET_USERS can only be used with a localhost DATABASE_URL.')
        }

        console.log('SEED_RESET_USERS=true detected. Purging local user data before seeding synthetic users...')
        await prisma.userRole.deleteMany({})
        await prisma.employeeProfile.deleteMany({})
        await prisma.user.deleteMany({})
    } else {
        console.log('Preserving existing user accounts. Set SEED_RESET_USERS=true for an explicit localhost reset.')
    }

    console.log('Seeding synthetic users...')
    await createUser('ops.manager@example.test', 'Demo Operations Manager', 'Operations Manager', operations.id, 'active', true)
    await createUser('ops.assistant@example.test', 'Demo Operations Assistant', 'Operations Assistant', operations.id, 'pending', false)
    await createUser('modeling.lead@example.test', 'Demo Modeling Lead', 'Head of 3D Modeling', engineering.id, 'pending', false)
    await createUser('web.developer@example.test', 'Demo Web Developer', 'Web Developer', engineering.id, 'pending', false)
    await createUser('project.manager@example.test', 'Demo Project Manager', 'Project Manager', marketing.id, 'pending', false)
    await createUser('admin@example.test', 'Demo Admin', 'admin', operations.id, 'active', true)

    console.log('Database seeded successfully with synthetic demo users.')
}

main()
    .catch((error) => {
        console.error('Seed failed.')
        console.error('Error Name:', error.name)
        console.error('Error Message:', error.message)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
