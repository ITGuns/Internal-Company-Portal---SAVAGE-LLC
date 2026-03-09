import { prisma, PrismaService } from './src/database/prisma.service';

async function debugUsers() {
    await PrismaService.connect();
    const users = await prisma.user.findMany();
    console.log(`Debug: Found ${users.length} users.`);

    users.forEach(u => {
        console.log(`User: ${u.email}, Name: [${u.name}], Avatar: [${u.avatar}]`);
        if (u.avatar && u.avatar.includes('pravatar.cc')) {
            console.log('  -> MATCHES pravatar.cc');
        }
    });

    process.exit(0);
}

debugUsers();
