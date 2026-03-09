const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUsers() {
    console.log('🔄 Fixing Admin name and replacing broken avatars...');

    try {
        // 1. Rename 'Overlord' to 'Admin' (based on user's screenshot showing the name as Overlord)
        const renamed = await prisma.user.updateMany({
            where: {
                OR: [
                    { name: 'Overlord' },
                    { email: 'admin@savage.com' }
                ]
            },
            data: { name: 'Admin' }
        });
        console.log(`✅ Renamed ${renamed.count} users to "Admin".`);

        // 2. Fetch all users to update their avatars
        const users = await prisma.user.findMany();
        let avatarUpdated = 0;

        for (const user of users) {
            const name = user.name || user.email || 'User';
            const isPravatar = user.avatar && user.avatar.includes('pravatar.cc');

            // Update if it's pravatar OR if it's null (to ensure everyone has an avatar)
            if (!user.avatar || isPravatar) {
                const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
                // Note: we use update because id is unique
                await prisma.user.update({
                    where: { id: user.id },
                    data: { avatar: newAvatar }
                });
                avatarUpdated++;
            }
        }
        console.log(`✅ Updated ${avatarUpdated} avatars to UI-Avatars.`);

        // 3. Fix names for Daryl and Caetanya specifically if they are missing
        // Daryl Dave Caña, Caetanya Arcipe
        await prisma.user.updateMany({
            where: { email: 'daryldave018@gmail.com' },
            data: { name: 'Daryl Dave Caña' }
        });
        await prisma.user.updateMany({
            where: { email: 'caetanya1@gmail.com' },
            data: { name: 'Caetanya Arcipe' }
        });

    } catch (err) {
        console.error('❌ Error fixing users:', err);
    } finally {
        await prisma.$disconnect();
    }
}

fixUsers();
