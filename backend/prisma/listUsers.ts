import { prisma } from '../src/database/prisma.service'

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, status: true, id: true }
  })
  console.log('Users in DB:')
  console.table(users)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
