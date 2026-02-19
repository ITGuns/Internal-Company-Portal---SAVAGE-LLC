import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🔄 Updating departments...')

    // Define new departments
    const newDepartments = [
        'Project Managers',
        'Website Developers',
        'Payroll / Finance'
    ]

    // Define old departments to remove (if they exist and have no critical data)
    const oldDepartments = ['Engineering', 'Marketing', 'Operations']

    // 1. Delete old departments (generic ones)
    // We use deleteMany but specific names to avoid wiping everything if user added custom ones
    for (const name of oldDepartments) {
        try {
            await prisma.department.deleteMany({
                where: { name }
            })
            console.log(`❌ Removed old department: ${name}`)
        } catch (e) {
            console.log(`⚠️ Could not remove ${name} (might be in use or not found):`, e)
        }
    }

    // 2. Create new departments
    for (const name of newDepartments) {
        const dept = await prisma.department.upsert({
            where: { name },
            update: {},
            create: {
                name,
                driveId: `drive-${name.toLowerCase().replace(/ /g, '-').replace(/\//g, '')}` // Generate a fake drive ID for now
            }
        })
        console.log(`✅ Ensure department exists: ${dept.name}`)
    }

    console.log('🎉 Departments updated successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Update failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
