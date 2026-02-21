import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

async function main() {
    const connectionString = process.env.DATABASE_URL
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    const count = await prisma.user.count()
    console.log('USER_COUNT:' + count)

    const users = await prisma.user.findMany({ take: 5 })
    console.log('USERS:', JSON.stringify(users, null, 2))

    await prisma.$disconnect()
}

main()
