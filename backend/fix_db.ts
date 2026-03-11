import { prisma } from './src/database/prisma.service';

async function main() {
  const dept = await prisma.department.findUnique({
    where: { name: 'Website Developers' }
  });

  if (!dept) throw new Error('dept not found');

  const updateUser = await prisma.userRole.updateMany({
    where: { 
      user: { email: 'gunsembacanan27@gmail.com' },
    },
    data: {
      departmentId: dept.id
    }
  });
  
  console.log('Updated:', updateUser);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
