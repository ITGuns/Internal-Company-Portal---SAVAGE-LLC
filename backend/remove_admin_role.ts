import { prisma } from './src/database/prisma.service';

async function main() {
  const result = await prisma.userRole.deleteMany({
    where: {
      user: { email: 'gunsembacanan27@gmail.com' },
      role: 'admin'
    }
  });

  console.log('Deleted admin roles:', result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
