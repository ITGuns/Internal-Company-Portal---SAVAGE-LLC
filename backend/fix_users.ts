import { prisma } from './src/database/prisma.service';

async function fixAvatarsForce() {
    console.log('🚀 Force updating avatars to UI-Avatars for a clean start...');

    const users = await prisma.user.findMany();
    let updatedCount = 0;

    for (const user of users) {
        const name = user.name || user.email || 'User';
        // If it's a pravatar or null/empty, update it
        if (!user.avatar || user.avatar.includes('pravatar.cc')) {
            const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;

            console.log(`Updating ${user.email} -> ${newAvatar}`);
            await prisma.user.update({
                where: { id: user.id },
                data: { avatar: newAvatar }
            });
            updatedCount++;
        }
    }

    console.log(`✅ Updated ${updatedCount} avatars.`);
    process.exit(0);
}

fixAvatarsForce().catch(err => {
    console.error(err);
    process.exit(1);
});
