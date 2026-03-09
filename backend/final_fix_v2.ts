import { prisma, PrismaService } from './src/database/prisma.service';

async function finalFix() {
    await PrismaService.connect();

    // 1. Set Admin name to "Overlord" (as per user preference from request #1 and recent comment)
    // But ensure technical role is "admin"
    console.log('🔄 Setting Admin name to Overlord...');
    await prisma.user.update({
        where: { email: 'admin@savage.com' },
        data: { name: 'Overlord' }
    });

    // Ensure the role is "admin"
    await prisma.userRole.updateMany({
        where: {
            user: { email: 'admin@savage.com' }
        },
        data: { role: 'admin' }
    });

    // 2. Fix Avatars - Force update ANY avatar that isn't a proper URL or base64
    const users = await prisma.user.findMany();
    console.log('🔄 Checking avatars...');
    for (const user of users) {
        const name = user.name || user.email || 'User';
        const avatar = user.avatar || '';

        // If avatar is just initials or pravatar or empty, replace with UI-Avatars URL
        if (avatar.length <= 2 || avatar.includes('pravatar.cc') || !avatar) {
            const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
            console.log(`Updating avatar for ${user.email}: ${avatar} -> URL`);
            await prisma.user.update({
                where: { id: user.id },
                data: { avatar: newAvatar }
            });
        }
    }

    // 3. Ensure Daryl and Caetanya have their full names
    await prisma.user.updateMany({
        where: { email: 'daryldave018@gmail.com' },
        data: { name: 'Daryl Dave Caña' }
    });
    await prisma.user.updateMany({
        where: { email: 'caetanya1@gmail.com' },
        data: { name: 'Caetanya Arcipe' }
    });

    console.log('✅ Final fix complete.');
    process.exit(0);
}

finalFix();
