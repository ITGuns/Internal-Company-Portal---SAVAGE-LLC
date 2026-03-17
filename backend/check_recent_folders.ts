import { prisma } from './src/database/prisma.service';

async function main() {
  const folders = await prisma.fileFolder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Recent Folders:', JSON.stringify(folders, null, 2));

  const allWebDepts = await prisma.fileFolder.findMany({
    where: { department: { contains: 'web', mode: 'insensitive' } }
  });
  console.log('All Web Folders:', JSON.stringify(allWebDepts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
