import { prisma } from './src/database/prisma.service';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'gunsembacanan27@gmail.com' },
    include: { roles: true }
  });
  console.log('User:', JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
