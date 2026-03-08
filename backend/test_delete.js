const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'gunsembacanan24@gmail.com' } });
  if (user) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Deleted user successfully.');
  } else {
    console.log('User not found.');
  }
}

main().catch(console.error).finally(async () => { await prisma.$disconnect() });
