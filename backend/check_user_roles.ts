import { prisma } from './src/database/prisma.service';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'gunsembacanan27@gmail.com' },
    include: {
      roles: {
        include: {
          department: true
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', user.name, '(', user.email, ')');
  console.log('Roles/Departments:');
  user.roles.forEach(r => {
    console.log(`- Role: ${r.role}, Dept: ${r.department?.name || 'NULL'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
