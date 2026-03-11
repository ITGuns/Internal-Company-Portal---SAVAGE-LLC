import { prisma } from './src/database/prisma.service';

async function main() {
  const newFolder = await prisma.fileFolder.create({
    data: {
      name: 'TEST WEB FOLDER',
      type: 'folder',
      department: 'Website Developers',
      driveLink: 'https://drive.google.com/drive/folders/1ehydT9z4Y849HGCWXB9OJDPZJ_b7AsA9',
      customColor: '#3b82f6',
      createdById: 'cmmhsoge9000004icd675k3of' // Daryl
    }
  });
  console.log('Created:', newFolder);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
