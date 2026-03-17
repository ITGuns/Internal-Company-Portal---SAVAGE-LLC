import { prisma } from './src/database/prisma.service';

async function main() {
  const folders = await prisma.fileFolder.findMany({
    orderBy: { createdAt: 'desc' }
  });
  folders.forEach(f => console.log(`${f.id} | ${f.name} | ${f.department} | Creator: ${f.createdById} | Parent: ${f.parentId}`));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
