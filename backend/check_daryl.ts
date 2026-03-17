import { prisma } from './src/database/prisma.service';

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'daryl', mode: 'insensitive' } },
    include: { roles: { include: { department: true } } }
  });
  console.log('Users:', JSON.stringify(users, null, 2));

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
