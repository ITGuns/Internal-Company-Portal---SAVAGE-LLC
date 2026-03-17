import { prisma } from './src/database/prisma.service';

async function main() {
  const folders = await prisma.fileFolder.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(folders, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
