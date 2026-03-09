import { prisma, PrismaService } from './src/database/prisma.service';

async function fixOverlordRole() {
    await PrismaService.connect();
    const overlordRoles = await prisma.userRole.findMany({
        where: {
            role: {
                contains: 'Overlord',
                mode: 'insensitive'
            }
        }
    });

    console.log(`Found ${overlordRoles.length} roles containing "Overlord".`);
    for (const role of overlordRoles) {
        console.log(`Updating role ${role.id} (${role.role}) -> admin`);
        await prisma.userRole.update({
            where: { id: role.id },
            data: { role: 'admin' }
        });
    }

    process.exit(0);
}

fixOverlordRole();
