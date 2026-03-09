const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv/config');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🚀 Updating Admin to Overlord...');

    // 1. Update User names
    const updatedUsers = await prisma.user.updateMany({
        where: { name: 'Savage Admin' },
        data: { name: 'Overlord' }
    });
    console.log(`✅ Updated ${updatedUsers.count} user names.`);

    // 2. Update Role names in UserRole table
    // We update both 'admin' and 'administrator' to 'overlord'
    const updatedRoles = await prisma.userRole.updateMany({
        where: {
            role: {
                in: ['admin', 'administrator'],
                mode: 'insensitive'
            }
        },
        data: { role: 'overlord' }
    });
    console.log(`✅ Updated ${updatedRoles.count} user roles.`);

    // 3. Update AvailableRole table if it exists
    const updatedAvailableRoles = await prisma.availableRole.updateMany({
        where: {
            name: {
                in: ['Admin', 'Administrator', 'admin', 'administrator'],
                mode: 'insensitive'
            }
        },
        data: { name: 'Overlord' }
    });
    console.log(`✅ Updated ${updatedAvailableRoles.count} available roles.`);

    console.log('🎉 Update complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
