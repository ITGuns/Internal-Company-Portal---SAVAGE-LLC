
import { prisma } from './database/prisma.service';

async function listDepts() {
    const depts = await prisma.department.findMany();
    console.log('DEPARTMENTS:', JSON.stringify(depts, null, 2));
    await prisma.$disconnect();
}
listDepts();
