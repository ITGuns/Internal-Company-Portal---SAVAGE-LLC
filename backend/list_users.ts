import { prisma, PrismaService } from './src/database/prisma.service';

async function listAllUsers() {
    await PrismaService.connect();
    const users = await prisma.user.findMany();
    console.log(`LIST OF USERS (${users.length}):`);
    users.forEach(u => {
        console.log(`- [${u.email}] Name: "${u.name}", Avatar: "${u.avatar}"`);
    });

    // Find all Overlords
    const overlords = users.filter(u => u.name?.toLowerCase().includes('overlord'));
    if (overlords.length > 0) {
        console.log(`FOUND ${overlords.length} OVERLORDS:`);
        for (const o of overlords) {
            console.log(`Updating ${o.email} -> Admin`);
            await prisma.user.update({
                where: { id: o.id },
                data: { name: 'Admin' }
            });
        }
    } else {
        console.log('NO OVERLORDS FOUND IN DB.');
    }

    process.exit(0);
}

listAllUsers();
