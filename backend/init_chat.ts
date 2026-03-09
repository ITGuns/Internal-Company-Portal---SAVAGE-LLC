import { prisma } from './src/database/prisma.service';
import { ChatService } from './src/chat/chat.service';

async function initGeneralChannel() {
    console.log('🔍 Checking for General channel...');

    const chatService = new ChatService();

    // Find all channels
    const conversations = await prisma.conversation.findMany({
        where: { type: 'channel' }
    });

    let general = conversations.find(c =>
        c.name?.toLowerCase() === 'general' || c.name?.toLowerCase() === 'global'
    );

    if (!general) {
        console.log('🚀 Creating "General" channel...');
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const userIds = allUsers.map(u => u.id);

        // We need at least one user to create a conversation if we use the service's logic
        // but the service handles "General" specially to add all users anyway.
        general = await chatService.createConversation('channel', userIds, 'General');
        console.log('✅ "General" channel created with ID:', general.id);

        // Add a welcome message
        await chatService.sendMessage(
            general.id,
            userIds[0] || 'system',
            'Welcome to the SAVAGE LLC General Chat! Connect with your colleagues here.'
        );
        console.log('💬 Welcome message sent.');
    } else {
        console.log('📍 "General" channel already exists with ID:', general.id);

        // Ensure all users are in it
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const participantCount = await prisma.participant.count({
            where: { conversationId: general.id }
        });

        if (participantCount < allUsers.length) {
            console.log(`👥 Adding missing users to General channel (${participantCount} -> ${allUsers.length})...`);
            for (const user of allUsers) {
                await prisma.participant.upsert({
                    where: {
                        conversationId_userId: {
                            conversationId: general.id,
                            userId: user.id
                        }
                    },
                    update: {},
                    create: {
                        conversationId: general.id,
                        userId: user.id
                    }
                });
            }
            console.log('✅ Users synchronized.');
        }
    }

    process.exit(0);
}

initGeneralChannel().catch(err => {
    console.error(err);
    process.exit(1);
});
