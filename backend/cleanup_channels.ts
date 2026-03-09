import { prisma, PrismaService } from './src/database/prisma.service';

async function cleanupChannels() {
    await PrismaService.connect();

    // 1. Delete inappropriate channel
    const inappropriate = await prisma.conversation.findMany({
        where: {
            name: {
                contains: 'sex-workers',
                mode: 'insensitive'
            }
        }
    });

    for (const c of inappropriate) {
        console.log(`Deleting inappropriate channel: ${c.name} (${c.id})`);
        await prisma.participant.deleteMany({ where: { conversationId: c.id } });
        await prisma.message.deleteMany({ where: { conversationId: c.id } });
        await prisma.conversation.delete({ where: { id: c.id } });
    }

    // 2. Consolidate "General" channels
    const generalChannels = await prisma.conversation.findMany({
        where: {
            OR: [
                { name: 'General' },
                { name: 'general-chat' },
                { name: 'global' }
            ],
            type: 'channel'
        }
    });

    if (generalChannels.length > 1) {
        const keep = generalChannels[0];
        const others = generalChannels.slice(1);

        console.log(`Keeping channel: ${keep.name} (${keep.id})`);

        for (const other of others) {
            console.log(`Merging channel: ${other.name} (${other.id}) into ${keep.id}`);

            // Move participants
            const participants = await prisma.participant.findMany({ where: { conversationId: other.id } });
            for (const p of participants) {
                await prisma.participant.upsert({
                    where: { conversationId_userId: { conversationId: keep.id, userId: p.userId } },
                    update: {},
                    create: { conversationId: keep.id, userId: p.userId }
                });
            }

            // Move messages
            await prisma.message.updateMany({
                where: { conversationId: other.id },
                data: { conversationId: keep.id }
            });

            // Delete other channel
            await prisma.participant.deleteMany({ where: { conversationId: other.id } });
            await prisma.conversation.delete({ where: { id: other.id } });
        }

        // Ensure the remaining one is named "General"
        await prisma.conversation.update({
            where: { id: keep.id },
            data: { name: 'General' }
        });
    }

    console.log('✅ Channel cleanup complete.');
    process.exit(0);
}

cleanupChannels();
