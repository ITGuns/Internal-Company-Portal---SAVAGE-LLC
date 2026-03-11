import { prisma } from './src/database/prisma.service';

async function main() {
  const folders = await prisma.fileFolder.findMany({
    where: { name: { contains: 'web', mode: 'insensitive' } },
  });
  console.log('Web Folders By Name:', JSON.stringify(folders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
