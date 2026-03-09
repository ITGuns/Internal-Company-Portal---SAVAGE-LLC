import { prisma, PrismaService } from './src/database/prisma.service';

async function listUsers() {
    await PrismaService.connect();
    const users = await prisma.user.findMany({
        include: {
            roles: true
        }
    });
    console.log(`TOTAL USERS: ${users.length}`);
    users.forEach(u => {
        const roleNames = u.roles.map(r => r.role).join(', ');
        console.log(`- [${u.email}] NAME: [${u.name}] ROLES: [${roleNames}]`);
    });

    // Also list all conversations
    const conversations = await prisma.conversation.findMany();
    console.log(`TOTAL CONVERSATIONS: ${conversations.length}`);
    conversations.forEach(c => {
        console.log(`- ID: ${c.id} NAME: [${c.name}] TYPE: [${c.type}]`);
    });

    process.exit(0);
}

listUsers();
