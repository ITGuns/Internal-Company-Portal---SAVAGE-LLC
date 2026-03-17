import { prisma } from './src/database/prisma.service';

async function main() {
  await prisma.fileFolder.deleteMany({
    where: { name: 'TEST WEB FOLDER' }
  });
  console.log('Deleted test folder');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
