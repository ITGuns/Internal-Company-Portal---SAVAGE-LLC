
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking for John Doe in database...')
    const john = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { contains: 'john', mode: 'insensitive' } },
                { name: { contains: 'John', mode: 'insensitive' } }
            ]
        }
    })

    if (john) {
        console.log('Found user:', john)
        console.log('Deleting user...')
        try {
            await prisma.user.delete({ where: { id: john.id } })
            console.log('Deleted successfully.')
        } catch (e) {
            console.error('Failed to delete:', e)
        }
    } else {
        console.log('No user found matching John/john.')
    }

    const allUsers = await prisma.user.findMany()
    console.log('All users in DB:', allUsers)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
