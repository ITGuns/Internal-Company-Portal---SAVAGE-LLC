import { prisma } from './src/database/prisma.service';

async function main() {
  const admins = await prisma.userRole.findMany({
    where: { role: 'admin' },
    include: {
      user: true
    }
  });

  console.log('Admins in DB:');
  admins.forEach(r => {
    console.log(`- ${r.user.name} (${r.user.email})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
