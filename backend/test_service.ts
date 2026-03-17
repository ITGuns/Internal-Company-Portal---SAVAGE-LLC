import { FileDirectoryService } from './src/file-directory/file-directory.service';
import { prisma } from './src/database/prisma.service';

const service = new FileDirectoryService();

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

  if (!user) throw new Error('user not found');

  const role = user.roles.some(r => r.role === 'admin') ? 'admin' : (user.roles[0]?.role || 'member');
  const departments = user.roles.map(r => r.department?.name).filter((d): d is string => !!d);

  console.log('Role:', role);
  console.log('Departments:', departments);

  const folders = await service.findAll(departments, role);
  console.log('Folders returned:', folders.length);
  folders.forEach(f => console.log(`- ${f.name} (${f.department})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
