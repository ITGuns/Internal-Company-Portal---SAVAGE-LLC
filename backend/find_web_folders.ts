import { prisma } from './src/database/prisma.service';

async function main() {
  const folders = await prisma.fileFolder.findMany({
    where: { 
      OR: [
        { department: { contains: 'web', mode: 'insensitive' } },
        { name: { contains: 'web', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Web Folders Found:', JSON.stringify(folders, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
