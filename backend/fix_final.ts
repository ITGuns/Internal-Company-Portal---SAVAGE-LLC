import { prisma, PrismaService } from './src/database/prisma.service';

async function fixUsersAndChat() {
    console.log('🔄 Connecting to Database...');
    await PrismaService.connect();

    const users = await prisma.user.findMany();
    console.log(`👥 Found ${users.length} users in database.`);

    let renamedCount = 0;
    let avatarCount = 0;

    for (const user of users) {
        let needsUpdate = false;
        const data: any = {};

        // 1. Fix Admin name
        if (user.email === 'admin@savage.com' && user.name !== 'Admin') {
            data.name = 'Admin';
            needsUpdate = true;
            renamedCount++;
        }

        // 2. Fix broken avatars
        if (!user.avatar || user.avatar.includes('pravatar.cc')) {
            const name = user.name || user.email || 'User';
            data.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
            needsUpdate = true;
            avatarCount++;
        }

        // 3. Fix missing names for Daryl and Caetanya
        if (user.email === 'daryldave018@gmail.com' && (!user.name || user.name === 'User')) {
            data.name = 'Daryl Dave Caña';
            needsUpdate = true;
        }
        if (user.email === 'caetanya1@gmail.com' && (!user.name || user.name === 'User')) {
            data.name = 'Caetanya Arcipe';
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`Updating ${user.email}...`);
            await prisma.user.update({
                where: { id: user.id },
                data
            });
        }
    }

    console.log(`✅ Fixed ${renamedCount} names and ${avatarCount} avatars.`);

    // 4. Also ensure General channel exists and everyone is in it
    const conversations = await prisma.conversation.findMany({
        where: { type: 'channel' }
    });
    let general = conversations.find(c =>
        c.name?.toLowerCase() === 'general' || c.name?.toLowerCase() === 'global'
    );

    if (general) {
        console.log(`📍 Found General channel: ${general.id}. Ensuring all users are participants...`);
        for (const user of users) {
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
        console.log('✅ Channel participants synchronized.');
    }

    process.exit(0);
}

fixUsersAndChat().catch(err => {
    console.error(err);
    process.exit(1);
});
