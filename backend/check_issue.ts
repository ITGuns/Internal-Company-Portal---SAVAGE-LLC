import { prisma } from './src/database/prisma.service';

async function main() {
  const users = await prisma.user.findMany({
    where: { 
      email: { contains: 'guns', mode: 'insensitive' }
    },
    include: { roles: { include: { department: true } } }
  });
  console.log('Gun Users:', JSON.stringify(users, null, 2));

  const folders = await prisma.fileFolder.findMany({
    where: { department: { contains: 'web', mode: 'insensitive' } }
  });
  console.log('Web Folders:', folders);
  
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
