const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for General channel...');
    const general = await prisma.conversation.findFirst({
        where: { name: 'General' }
    });

    if (general) {
        console.log('General channel already exists:', general.id);
    } else {
        console.log('Creating General channel...');
        const allUsers = await prisma.user.findMany({
            select: { id: true }
        });

        const newGeneral = await prisma.conversation.create({
            data: {
                name: 'General',
                type: 'channel',
                participants: {
                    create: allUsers.map(u => ({ userId: u.id }))
                }
            }
        });
        console.log('Created General channel with ID:', newGeneral.id);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
