import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import * as bcrypt from 'bcrypt'
import { upsertClientServiceTierPresets } from '../src/clients/client-service-tier-presets'
import {
    ORG_DEPARTMENT_ROLE_CATALOG,
    normalizeOrgRoleName,
} from '../src/org/org-access-policy'

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

const DEMO_DEPARTMENT_DRIVE_IDS: Record<string, string> = {
    'Owners / Founders': 'sample-drive-id-owners-founders',
    'Project Management': 'sample-drive-id-project-management',
    Operations: 'sample-drive-id-operations',
    'Digital Marketing': 'sample-drive-id-digital-marketing',
    'Analytics / Data': 'sample-drive-id-analytics-data',
    'Automation / Tech': 'sample-drive-id-automation-tech',
    'Website Developers': 'sample-drive-id-website-developers',
    'Payroll / Finance': 'sample-drive-id-payroll-finance',
}

async function main() {
    console.log('Starting synthetic local database seed...')

    const departmentsByName = new Map<string, { id: string; name: string }>()

    for (const entry of ORG_DEPARTMENT_ROLE_CATALOG) {
        const department = await prisma.department.upsert({
            where: { name: entry.department },
            update: {},
            create: {
                name: entry.department,
                driveId: DEMO_DEPARTMENT_DRIVE_IDS[entry.department] || null,
            },
        })
        departmentsByName.set(department.name, department)
    }

    console.log('Created departments')

    const availableRoles = ORG_DEPARTMENT_ROLE_CATALOG.flatMap((entry) => {
        const department = departmentsByName.get(entry.department)
        if (!department) throw new Error(`Missing seeded department: ${entry.department}`)

        return entry.roles.map((name) => ({
            name,
            departmentId: department.id,
        }))
    })

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
                    role: normalizeOrgRoleName(roleName),
                },
            },
            update: {},
            create: {
                userId: user.id,
                departmentId: deptId,
                role: normalizeOrgRoleName(roleName),
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
    await createUser(
        'founder@example.test',
        'Demo Owner Founder',
        'Owner / Founder',
        departmentsByName.get('Owners / Founders')!.id,
        'active',
        true,
    )
    await createUser(
        'ops.manager@example.test',
        'Demo Operations Manager',
        'Operations Manager',
        departmentsByName.get('Operations')!.id,
        'active',
        true,
    )
    await createUser(
        'ops.assistant@example.test',
        'Demo Fulfillment VA',
        'Fulfillment / Logistics VA',
        departmentsByName.get('Operations')!.id,
        'pending',
        false,
    )
    await createUser(
        'backend.developer@example.test',
        'Demo Backend Developer',
        'Backend / Technical Developer',
        departmentsByName.get('Website Developers')!.id,
        'pending',
        false,
    )
    await createUser(
        'web.developer@example.test',
        'Demo Frontend Developer',
        'Frontend Developer',
        departmentsByName.get('Website Developers')!.id,
        'pending',
        false,
    )
    await createUser(
        'project.manager@example.test',
        'Demo Project Manager',
        'Project Manager',
        departmentsByName.get('Project Management')!.id,
        'pending',
        false,
    )
    await createUser(
        'bookkeeping@example.test',
        'Demo Bookkeeping',
        'Bookkeeping',
        departmentsByName.get('Payroll / Finance')!.id,
        'active',
        true,
    )
    await createUser(
        'admin@example.test',
        'Demo Admin',
        'admin',
        departmentsByName.get('Owners / Founders')!.id,
        'active',
        true,
    )

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
