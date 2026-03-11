import { prisma } from './src/database/prisma.service';

async function main() {
  const users = await prisma.user.findMany({
    include: { roles: { include: { department: true } } }
  });
  
  const webDevs = users.filter(u => u.roles.some(r => r.department?.name === 'Website Developers'));
  console.log('Web Devs:', JSON.stringify(webDevs.map(w => ({ id: w.id, name: w.name, email: w.email, roles: w.roles.map(r => ({ role: r.role, dept: r.department?.name })) })), null, 2));

  const allFolders = await prisma.fileFolder.findMany();
  const webFolder = allFolders.filter(f => f.department.toLowerCase().includes('web'));
  console.log('Web Folders:', webFolder);

  const depts = await prisma.department.findMany();
  console.log('All Departments in DB:', depts.map(d => d.name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
