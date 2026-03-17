import { prisma } from './src/database/prisma.service';

async function main() {
  const allFolders = await prisma.fileFolder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15
  });
  console.log('Last 15 Folders:', JSON.stringify(allFolders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
