import { prisma } from './src/database/prisma.service';
import { FileDirectoryService } from './src/file-directory/file-directory.service';

async function main() {
  const service = new FileDirectoryService();
  const folders = await service.findAll(["Website Developers"], "Lead Backend Developer");
  console.log('Folders for Website Developers:', folders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
