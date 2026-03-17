import { prisma } from './src/database/prisma.service';

async function main() {
  const ds = await prisma.department.findMany();
  console.log('Departments in DB:', ds.map(d => d.name));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
